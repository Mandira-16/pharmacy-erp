// ── Validation helpers used across all API routes and frontend forms ──────────

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

// Sri Lankan NIC — 9 digits + V/X or 12 digits
export function validateNIC(nic: string): boolean {
  return /^[0-9]{9}[VXvx]$/.test(nic) || /^[0-9]{12}$/.test(nic)
}

// Sri Lankan phone — 07X-XXXXXXX or 07XXXXXXXXX
export function validatePhone(phone: string): boolean {
  return /^0[0-9]{9}$/.test(phone.replace(/-/g, ''))
}

// SKU format — uppercase letters, numbers, hyphens e.g. AMX-500MG
export function validateSKU(sku: string): boolean {
  return /^[A-Z0-9][A-Z0-9\-]{1,19}$/.test(sku)
}

// Batch number — e.g. B2024-001 or B003-A
export function validateBatchNumber(batch: string): boolean {
  return /^[A-Z0-9][A-Z0-9\-]{2,19}$/.test(batch)
}

// Generic name — letters, spaces, numbers, brackets, hyphens
export function validateGenericName(name: string): boolean {
  return /^[a-zA-Z0-9\s\-\(\)\.]{2,100}$/.test(name)
}

// Medicine name — letters, spaces, numbers, hyphens
export function validateMedicineName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 100
}

// Positive decimal price
export function validatePrice(price: number): boolean {
  return price > 0 && price <= 999999 && /^\d+(\.\d{1,2})?$/.test(price.toString())
}

// Positive integer
export function validatePositiveInt(n: number): boolean {
  return Number.isInteger(n) && n > 0
}

// Future date
export function validateFutureDate(date: string): boolean {
  return new Date(date) > new Date()
}

// Email
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Medicine form validation
export function validateMedicineForm(data: any): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data.name || !validateMedicineName(data.name))
    errors.name = 'Medicine name must be 2–100 characters'

  if (!data.sku || !validateSKU(data.sku))
    errors.sku = 'SKU must be uppercase letters, numbers and hyphens only (e.g. AMX-500MG)'

  if (data.genericName && !validateGenericName(data.genericName))
    errors.genericName = 'Generic name contains invalid characters'

  if (!data.category || data.category.trim().length < 2)
    errors.category = 'Category is required'

  if (!data.unitPrice || !validatePrice(Number(data.unitPrice)))
    errors.unitPrice = 'Unit price must be a positive number (max 2 decimal places)'

  if (!data.reorderPoint || !validatePositiveInt(Number(data.reorderPoint)))
    errors.reorderPoint = 'Reorder point must be a positive whole number'

  return { valid: Object.keys(errors).length === 0, errors }
}

// Batch form validation
export function validateBatchForm(data: any): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data.batchNumber || !validateBatchNumber(data.batchNumber))
    errors.batchNumber = 'Batch number must be uppercase letters, numbers and hyphens (e.g. B2024-001)'

  if (!data.quantity || !validatePositiveInt(Number(data.quantity)))
    errors.quantity = 'Quantity must be a positive whole number'

  if (!data.expiryDate || !validateFutureDate(data.expiryDate))
    errors.expiryDate = 'Expiry date must be a future date'

  return { valid: Object.keys(errors).length === 0, errors }
}

// Patient form validation
export function validatePatientForm(data: any): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data.name || data.name.trim().length < 2)
    errors.name = 'Full name is required (min 2 characters)'

  if (data.nic && !validateNIC(data.nic))
    errors.nic = 'NIC must be 9 digits + V/X (e.g. 700123456V) or 12 digits'

  if (data.phone && !validatePhone(data.phone))
    errors.phone = 'Phone must be a valid Sri Lankan number (e.g. 0771234567)'

  if (data.email && !validateEmail(data.email))
    errors.email = 'Please enter a valid email address'

  return { valid: Object.keys(errors).length === 0, errors }
}