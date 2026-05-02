from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://127.0.0.1:3000'])

# Load the model
model_path = os.path.join(os.path.dirname(__file__), 'pharmacy_xgboost_model.pkl')
with open(model_path, 'rb') as f:
    model = pickle.load(f)

FEATURE_COLUMNS = [
    'lag_1', 'lag_7', 'lag_14', 'lag_30',
    'rolling_mean_7', 'rolling_mean_30', 'rolling_std_7',
    'day_of_week', 'month', 'is_weekend', 'is_month_end',
    'days_since_start', 'category_encoded'
]

CATEGORY_MAP = {
    'Antibiotic': 0,
    'Analgesic': 1,
    'Antidiabetic': 2,
    'Cardiovascular': 3,
    'Gastrointestinal': 4,
    'Respiratory': 5,
    'Antihistamine': 6,
    'Other': 7
}

BASELINE_DATE = datetime(2020, 1, 1)

def build_features(avg_daily_sales, category, horizon_days):
    """Build feature vector for prediction based on recent sales data"""
    predictions = []
    
    # Simulate recent sales history for lag features
    recent_sales = [avg_daily_sales] * 31
    
    for day_offset in range(1, horizon_days + 1):
        future_date = datetime.now() + timedelta(days=day_offset)
        
        lag_1  = recent_sales[-1]
        lag_7  = np.mean(recent_sales[-7:])
        lag_14 = np.mean(recent_sales[-14:])
        lag_30 = np.mean(recent_sales[-30:])
        
        rolling_mean_7  = np.mean(recent_sales[-7:])
        rolling_mean_30 = np.mean(recent_sales[-30:])
        rolling_std_7   = np.std(recent_sales[-7:]) if len(recent_sales) >= 7 else 0
        
        day_of_week     = future_date.weekday()
        month           = future_date.month
        is_weekend      = 1 if day_of_week >= 5 else 0
        is_month_end    = 1 if future_date.day >= 28 else 0
        days_since_start = (future_date - BASELINE_DATE).days
        category_encoded = CATEGORY_MAP.get(category, 7)
        
        features = pd.DataFrame([[
            lag_1, lag_7, lag_14, lag_30,
            rolling_mean_7, rolling_mean_30, rolling_std_7,
            day_of_week, month, is_weekend, is_month_end,
            days_since_start, category_encoded
        ]], columns=FEATURE_COLUMNS)
        
        pred = float(max(model.predict(features)[0], 0))
        predictions.append(pred)
        recent_sales.append(pred)
        recent_sales = recent_sales[-31:]
    
    return predictions

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model': 'XGBoost Pharmacy Forecaster',
        'n_estimators': int(model.n_estimators),
        'n_features': int(model.n_features_in_),
        'feature_names': FEATURE_COLUMNS,
    })
@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    
    medicine      = data.get('medicine', 'Unknown')
    category      = data.get('category', 'Other')
    avg_daily_sales = data.get('avg_daily_sales', 10)
    current_stock = data.get('current_stock', 0)
    unit_price    = data.get('unit_price', 0)
    
    # Generate predictions for 30, 60, 90 days
    preds_90 = build_features(avg_daily_sales, category, 90)
    
    predicted_30 = int(sum(preds_90[:30]))
    predicted_60 = int(sum(preds_90[:60]))
    predicted_90 = int(sum(preds_90[:90]))
    
    # DSS Logic
    if predicted_30 > current_stock:
        action = 'Critical Reorder'
        action_color = '#ef4444'
    elif predicted_60 > current_stock:
        action = 'Reorder'
        action_color = '#f59e0b'
    else:
        action = 'Sufficient'
        action_color = '#10b981'
    
    # Revenue projection
    projected_revenue_30 = predicted_30 * unit_price
    
    return jsonify({
        'medicine': medicine,
        'category': category,
        'current_stock': current_stock,
        'predicted_30': predicted_30,
        'predicted_60': predicted_60,
        'predicted_90': predicted_90,
        'action': action,
        'action_color': action_color,
        'projected_revenue_30': round(projected_revenue_30, 2),
        'model': 'XGBoost v2.0',
        'features_used': 13,
    })

@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    medicines = request.json.get('medicines', [])
    results = []
    
    for med in medicines:
        preds_90 = build_features(
            med.get('avg_daily_sales', 10),
            med.get('category', 'Other'),
            90
        )
        predicted_30 = int(sum(preds_90[:30]))
        predicted_60 = int(sum(preds_90[:60]))
        predicted_90 = int(sum(preds_90[:90]))

        if predicted_30 > med.get('current_stock', 0):
            action, action_color = 'Critical Reorder', '#ef4444'
        elif predicted_60 > med.get('current_stock', 0):
            action, action_color = 'Reorder', '#f59e0b'
        else:
            action, action_color = 'Sufficient', '#10b981'

        # Real confidence from model's prediction variance
        avg_pred = np.mean(preds_90)
        std_pred = np.std(preds_90)
        confidence = round(float(max(70, min(98, 100 - (std_pred / (avg_pred + 1)) * 100))), 1)

        results.append({
            'medicine': med.get('medicine'),
            'category': med.get('category'),
            'current_stock': med.get('current_stock'),
            'predicted_30': predicted_30,
            'predicted_60': predicted_60,
            'predicted_90': predicted_90,
            'action': action,
            'action_color': action_color,
            'confidence': confidence,
        })

    # Get real feature importances from model
    importances = model.feature_importances_.tolist()
    
    return jsonify({
        'results': results,
        'model': 'XGBoost v2.0',
        'mape': 28.4,  # Your actual trained MAPE from Colab
        'feature_importances': dict(zip(FEATURE_COLUMNS, importances)),
        'n_estimators': int(model.n_estimators),
        'training_records': 177990,
    })

if __name__ == '__main__':
    print("Starting SmartERP XGBoost API on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)