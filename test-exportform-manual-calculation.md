# Test Plan: ExportForm Manual Calculation System

## ✅ **COMPLETED CHANGES**

### **1. Tắt Auto-Calculation**
- ✅ Modified `calculateDetailTotals()` to support `forceCalculation` parameter
- ✅ Removed `updateInvoiceTotals()` automatic calls
- ✅ Disabled auto-calculation in onChange events
- ✅ Added "Không tự động tính toán" comments

### **2. Thêm Manual Calculation Button**
- ✅ Added `isCalculating` state
- ✅ Implemented `handleManualCalculation()` function
- ✅ Added "Tính toán lại tất cả" button to header
- ✅ Consistent styling with ImportForm

### **3. UI Sync Improvements**
- ✅ Changed `total_before_tax` input from `defaultValue` to `value` with `form.watch()`
- ✅ Changed `total_after_tax` input from `defaultValue` to `value` with `form.watch()`
- ✅ Implemented force re-render logic

## 🧪 **TEST SCENARIOS**

### **Test 1: Manual Calculation Override**
1. **Setup:** Create new export invoice with 2 items
2. **Input:** 
   - Item 1: Quantity=10, Price=1000, Tax=10%
   - Item 2: Quantity=5, Price=2000, Tax=5%
3. **Manual Edit:** Change "Thành tiền" of Item 1 to 999999
4. **Action:** Click "Tính toán lại tất cả"
5. **Expected:** 
   - Item 1 "Thành tiền" = 10000 (calculated from quantity × price)
   - Item 2 "Thành tiền" = 10000
   - Invoice totals updated automatically

### **Test 2: UI Sync Verification**
1. **Setup:** Edit existing export invoice
2. **Manual Edit:** Change multiple "Thành tiền" fields
3. **Action:** Click "Tính toán lại tất cả"
4. **Expected:** UI immediately shows recalculated values (no refresh needed)

### **Test 3: Loading State**
1. **Action:** Click "Tính toán lại tất cả"
2. **Expected:** 
   - Button shows "Đang tính..." with spinner
   - Button is disabled during calculation
   - Toast notification appears after completion

### **Test 4: No Auto-Calculation**
1. **Input:** Change quantity in any row
2. **Expected:** "Thành tiền" does NOT auto-update
3. **Input:** Change price in any row
4. **Expected:** "Thành tiền" does NOT auto-update
5. **Input:** Change tax rate
6. **Expected:** "Thành tiền" does NOT auto-update

### **Test 5: Manual Edit Preservation**
1. **Manual Edit:** Change "Thành tiền" to custom value
2. **Input:** Change quantity or price
3. **Expected:** Manual "Thành tiền" value is preserved
4. **Action:** Click "Tính toán lại tất cả"
5. **Expected:** Manual value is overridden with calculated value

## 🎯 **EXPECTED BEHAVIOR**

### **Before Changes:**
- Auto-calculation on every input change
- No manual calculation button
- UI sync issues with form state

### **After Changes:**
- No auto-calculation (manual input only)
- "Tính toán lại tất cả" button available
- Perfect UI sync with form state
- Consistent behavior with ImportForm

## 📝 **VERIFICATION CHECKLIST**

- [ ] Manual calculation button appears in header
- [ ] Button styling matches ImportForm
- [ ] No auto-calculation on quantity change
- [ ] No auto-calculation on price change
- [ ] No auto-calculation on tax rate change
- [ ] Manual calculation overrides all manual edits
- [ ] UI updates immediately after calculation
- [ ] Toast notifications work correctly
- [ ] Loading state works correctly
- [ ] Form validation still works
- [ ] Inventory checking still works
- [ ] Edit mode functionality preserved
- [ ] View mode functionality preserved

## 🚀 **NEXT STEPS**

1. Test all scenarios manually
2. Verify consistency with ImportForm
3. Check for any regression issues
4. Document any additional improvements needed
