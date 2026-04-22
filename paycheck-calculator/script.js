document.addEventListener('DOMContentLoaded', () => {
    // Inputs
    const incomeTypeRadios = document.querySelectorAll('input[name="incomeType"]');
    const incomeAmountInput = document.getElementById('incomeAmount');
    const hoursPerWeekInput = document.getElementById('hoursPerWeek');
    const hoursGroup = document.getElementById('hoursGroup');
    const payFrequencySelect = document.getElementById('payFrequency');
    const stateTaxInput = document.getElementById('stateTax');
    const deductionsInput = document.getElementById('deductions');

    // Outputs
    const outGross = document.getElementById('outGross');
    const outDeductions = document.getElementById('outDeductions');
    const outTaxable = document.getElementById('outTaxable');
    const outFederal = document.getElementById('outFederal');
    const outFICA = document.getElementById('outFICA');
    const outState = document.getElementById('outState');
    const outNet = document.getElementById('outNet');

    // Attach event listeners for real-time calculation
    const inputs = [incomeAmountInput, hoursPerWeekInput, payFrequencySelect, stateTaxInput, deductionsInput];
    inputs.forEach(input => input.addEventListener('input', calculate));
    
    // Toggle between hourly and salary
    incomeTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if(e.target.value === 'hourly') {
                hoursGroup.style.display = 'block';
                incomeAmountInput.placeholder = "35.00";
                if(incomeAmountInput.value && incomeAmountInput.value > 1000) {
                    incomeAmountInput.value = ""; // clear if switching from salary to hourly and it's a huge number
                }
            } else {
                hoursGroup.style.display = 'none';
                incomeAmountInput.placeholder = "75000";
            }
            calculate();
        });
    });

    // Formatting helper
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    function calculate() {
        const incomeType = document.querySelector('input[name="incomeType"]:checked').value;
        const incomeAmount = parseFloat(incomeAmountInput.value) || 0;
        const hoursPerWeek = parseFloat(hoursPerWeekInput.value) || 40;
        const payFrequency = payFrequencySelect.value;
        const stateTaxRate = (parseFloat(stateTaxInput.value) || 0) / 100;
        const deductionsPerPaycheck = parseFloat(deductionsInput.value) || 0;

        // Pay periods per year
        const periodsMap = {
            'weekly': 52,
            'biweekly': 26,
            'semimonthly': 24,
            'monthly': 12,
            'annually': 1
        };
        const periodsPerYear = periodsMap[payFrequency];

        // Calculate Annual Gross
        let annualGross = 0;
        if (incomeType === 'salary') {
            annualGross = incomeAmount;
        } else {
            // Hourly: Amount * hours * 52
            annualGross = incomeAmount * hoursPerWeek * 52;
        }

        // Calculate Per Paycheck Gross
        const grossPerPaycheck = annualGross / periodsPerYear;
        
        // Taxable Pay (after pre-tax deductions)
        const taxablePaycheck = Math.max(0, grossPerPaycheck - deductionsPerPaycheck);
        const annualTaxable = taxablePaycheck * periodsPerYear;

        // FICA (7.65% flat rate for simplicity, ignoring SS cap for this lightweight estimator)
        const ficaPerPaycheck = taxablePaycheck * 0.0765;

        // State Tax
        const stateTaxPerPaycheck = taxablePaycheck * stateTaxRate;

        // Federal Tax Estimate (Single Filer 2024 simplified brackets)
        // Standard deduction roughly $14,600
        const stdDeduction = 14600;
        const adjustedAnnual = Math.max(0, annualTaxable - stdDeduction);
        
        let annualFedTax = 0;
        if (adjustedAnnual > 0) {
            // Very simplified 2024 brackets for single filers
            const b1 = 11600;
            const b2 = 47150;
            const b3 = 100525;
            const b4 = 191950;
            const b5 = 243725;
            const b6 = 609350;

            let remaining = adjustedAnnual;
            
            if (remaining > b6) { annualFedTax += (remaining - b6) * 0.37; remaining = b6; }
            if (remaining > b5) { annualFedTax += (remaining - b5) * 0.35; remaining = b5; }
            if (remaining > b4) { annualFedTax += (remaining - b4) * 0.32; remaining = b4; }
            if (remaining > b3) { annualFedTax += (remaining - b3) * 0.24; remaining = b3; }
            if (remaining > b2) { annualFedTax += (remaining - b2) * 0.22; remaining = b2; }
            if (remaining > b1) { annualFedTax += (remaining - b1) * 0.12; remaining = b1; }
            if (remaining > 0)  { annualFedTax += (remaining) * 0.10; }
        }

        const fedTaxPerPaycheck = annualFedTax / periodsPerYear;

        // Net Paycheck
        const netPaycheck = taxablePaycheck - fedTaxPerPaycheck - ficaPerPaycheck - stateTaxPerPaycheck;

        // Update UI
        outGross.textContent = formatCurrency(grossPerPaycheck);
        outDeductions.textContent = `-${formatCurrency(deductionsPerPaycheck)}`;
        outTaxable.textContent = formatCurrency(taxablePaycheck);
        outFederal.textContent = `-${formatCurrency(fedTaxPerPaycheck)}`;
        outFICA.textContent = `-${formatCurrency(ficaPerPaycheck)}`;
        outState.textContent = `-${formatCurrency(stateTaxPerPaycheck)}`;
        outNet.textContent = formatCurrency(netPaycheck);
    }
    
    // Initial calc
    calculate();
});
