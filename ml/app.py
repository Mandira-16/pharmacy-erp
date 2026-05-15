from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app)

model_path = os.path.join(os.path.dirname(__file__), 'pharmacy_xgboost_model.pkl')
with open(model_path, 'rb') as f:
    model = pickle.load(f)

FEATURE_COLUMNS = [
    'lag_1', 'lag_2', 'lag_3', 'lag_7', 'lag_14', 'lag_30',
    'rolling_mean_7', 'rolling_mean_30',
    'day_of_week', 'month_num', 'quarter', 'week_of_year', 'is_weekend',
    'stock_level', 'unit_price', 'expiry_days_remaining', 'covid_flag',
    'medicine_encoded', 'category_encoded', 'age_group_encoded',
]

CATEGORY_MAP = {
    'Antibiotic': 0, 'Analgesic': 1, 'Antidiabetic': 2,
    'Cardiovascular': 3, 'Gastrointestinal': 4, 'Respiratory': 5,
    'Antihistamine': 6, 'Antihypertensive': 7, 'Antiplatelet': 8,
    'Antilipemic': 9, 'Antacid': 10, 'Other': 11
}

BASELINE_DATE = datetime(2020, 1, 1)

def build_features(avg_daily_sales, category, horizon_days, stock_level=0, unit_price=0, expiry_days=999):
    predictions = []
    recent_sales = [avg_daily_sales] * 31

    for day_offset in range(1, horizon_days + 1):
        future_date = datetime.now() + timedelta(days=day_offset)

        lag_1  = recent_sales[-1]
        lag_2  = recent_sales[-2] if len(recent_sales) >= 2 else lag_1
        lag_3  = recent_sales[-3] if len(recent_sales) >= 3 else lag_1
        lag_7  = np.mean(recent_sales[-7:])
        lag_14 = np.mean(recent_sales[-14:])
        lag_30 = np.mean(recent_sales[-30:])

        rolling_mean_7  = np.mean(recent_sales[-7:])
        rolling_mean_30 = np.mean(recent_sales[-30:])

        day_of_week  = future_date.weekday()
        month_num    = future_date.month
        quarter      = (future_date.month - 1) // 3 + 1
        week_of_year = future_date.isocalendar()[1]
        is_weekend   = 1 if day_of_week >= 5 else 0

        category_encoded  = CATEGORY_MAP.get(category, 11)
        medicine_encoded  = abs(hash(category)) % 100
        age_group_encoded = 1  # default adult

        features = pd.DataFrame([[
            lag_1, lag_2, lag_3, lag_7, lag_14, lag_30,
            rolling_mean_7, rolling_mean_30,
            day_of_week, month_num, quarter, week_of_year, is_weekend,
            stock_level, unit_price, expiry_days, 0,
            medicine_encoded, category_encoded, age_group_encoded,
        ]], columns=FEATURE_COLUMNS)

        # Model was trained on log1p target — inverse transform
        log_pred = model.predict(features)[0]
        pred = float(max(np.expm1(log_pred), 0))
        predictions.append(pred)
        recent_sales.append(pred)
        recent_sales = recent_sales[-31:]

    return predictions


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model': 'XGBoost Pharmacy Forecaster — Optimised',
        'accuracy': 78.69,
        'mape': 21.31,
        'mae': 62.00,
        'rmse': 93.02,
        'n_estimators': int(model.n_estimators),
        'n_features': int(model.n_features_in_),
        'feature_names': FEATURE_COLUMNS,
        'training_records': 7485,
    })


@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    medicine        = data.get('medicine', 'Unknown')
    category        = data.get('category', 'Other')
    avg_daily_sales = data.get('avg_daily_sales', 10)
    current_stock   = data.get('current_stock', 0)
    unit_price      = data.get('unit_price', 0)
    expiry_days     = data.get('days_to_expiry', 999)

    preds_90 = build_features(avg_daily_sales, category, 90, current_stock, unit_price, expiry_days)
    predicted_30 = int(sum(preds_90[:30]))
    predicted_60 = int(sum(preds_90[:60]))
    predicted_90 = int(sum(preds_90[:90]))

    if predicted_30 > current_stock:
        action = 'Critical Reorder'; action_color = '#ef4444'
    elif predicted_60 > current_stock:
        action = 'Reorder'; action_color = '#f59e0b'
    else:
        action = 'Sufficient'; action_color = '#10b981'

    return jsonify({
        'medicine': medicine, 'category': category,
        'current_stock': current_stock,
        'predicted_30': predicted_30, 'predicted_60': predicted_60, 'predicted_90': predicted_90,
        'action': action, 'action_color': action_color,
        'projected_revenue_30': round(predicted_30 * unit_price, 2),
        'model': 'XGBoost Optimised', 'features_used': 20,
    })


@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    medicines = request.json.get('medicines', [])
    results = []

    for med in medicines:
        avg_daily = med.get('avg_daily_sales', 10)
        category  = med.get('category', 'Other')
        stock     = med.get('current_stock', 0)
        price     = med.get('unit_price', 0)
        expiry    = med.get('days_to_expiry', 999)

        preds_90 = build_features(avg_daily, category, 90, stock, price, expiry)
        predicted_30 = int(sum(preds_90[:30]))
        predicted_60 = int(sum(preds_90[:60]))
        predicted_90 = int(sum(preds_90[:90]))

        if predicted_30 > stock:
            action, action_color = 'Critical Reorder', '#ef4444'
        elif predicted_60 > stock:
            action, action_color = 'Reorder', '#f59e0b'
        else:
            action, action_color = 'Sufficient', '#10b981'

        avg_pred = np.mean(preds_90)
        std_pred = np.std(preds_90)
        confidence = round(float(max(70, min(98, 100 - (std_pred / (avg_pred + 1)) * 100))), 1)

        results.append({
            'medicine': med.get('medicine'), 'category': category,
            'current_stock': stock,
            'predicted_30': predicted_30, 'predicted_60': predicted_60, 'predicted_90': predicted_90,
            'action': action, 'action_color': action_color, 'confidence': confidence,
        })

    return jsonify({
        'results': results,
        'model': 'XGBoost Optimised',
        'mape': 21.31,
        'mae': 62.00,
        'rmse': 93.02,
        'feature_importances': dict(zip(FEATURE_COLUMNS, model.feature_importances_.tolist())),
        'n_estimators': int(model.n_estimators),
        'training_records': 7485,
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting SmartERP XGBoost Optimised API on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)