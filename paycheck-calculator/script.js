document.addEventListener('DOMContentLoaded', () => {
    // Inputs
    const incomeTypeRadios = document.querySelectorAll('input[name="incomeType"]');
    const incomeAmountInput = document.getElementById('incomeAmount');
    const hoursPerWeekInput = document.getElementById('hoursPerWeek');
    const hoursGroup = document.getElementById('hoursGroup');
    const otHoursInput = document.getElementById('otHours');
    const otGroup = document.getElementById('otGroup');
    const payFrequencySelect = document.getElementById('payFrequency');
    const stateTaxInput = document.getElementById('stateTax');
    const stateSelect = document.getElementById('stateSelect');
    const filingStatusSelect = document.getElementById('filingStatus');
    const retire401kInput = document.getElementById('retire401k');
    const medicalInsInput = document.getElementById('medicalIns');
    const otherPreTaxInput = document.getElementById('otherPreTax');
    const postTaxInput = document.getElementById('postTax');
    const stateTaxWarning = document.getElementById('stateTaxWarning');

    const stateTaxRates = {
        "AL": 5.0, "AK": 0.0, "AZ": 2.5, "AR": 4.4, "CA": 9.3, "CO": 4.4, "CT": 5.0, "DE": 6.6, "FL": 0.0, "GA": 5.49,
        "HI": 8.25, "ID": 5.8, "IL": 4.95, "IN": 3.05, "IA": 5.7, "KS": 5.7, "KY": 4.0, "LA": 4.25, "ME": 7.15, "MD": 5.75,
        "MA": 5.0, "MI": 4.25, "MN": 6.8, "MS": 4.7, "MO": 4.95, "MT": 5.9, "NE": 5.84, "NV": 0.0, "NH": 0.0, "NJ": 6.37,
        "NM": 4.9, "NY": 6.0, "NC": 4.5, "ND": 2.5, "OH": 3.5, "OK": 4.75, "OR": 8.75, "PA": 3.07, "RI": 5.99, "SC": 6.4,
        "SD": 0.0, "TN": 0.0, "TX": 0.0, "UT": 4.65, "VT": 6.6, "VA": 5.75, "WA": 0.0, "WV": 5.12, "WI": 5.3, "WY": 0.0
    };

    if (stateSelect) {
        stateSelect.addEventListener('change', (e) => {
            if (e.target.value && stateTaxRates[e.target.value] !== undefined) {
                stateTaxInput.value = stateTaxRates[e.target.value];
                if (stateTaxWarning) stateTaxWarning.style.display = 'block';
                calculate();
            } else {
                if (stateTaxWarning) stateTaxWarning.style.display = 'none';
            }
        });
    }

    // Outputs
    const outGross = document.getElementById('outGross');
    const outTaxable = document.getElementById('outTaxable');
    const out401k = document.getElementById('out401k');
    const outMedical = document.getElementById('outMedical');
    const outOtherPreTax = document.getElementById('outOtherPreTax');
    const outPostTax = document.getElementById('outPostTax');
    const row401k = document.getElementById('row401k');
    const rowMedical = document.getElementById('rowMedical');
    const rowOtherPreTax = document.getElementById('rowOtherPreTax');
    const rowPostTax = document.getElementById('rowPostTax');
    const outFederal = document.getElementById('outFederal');
    const outFICA = document.getElementById('outFICA');
    const outState = document.getElementById('outState');
    const outNet = document.getElementById('outNet');

    // Attach event listeners for real-time calculation
    const inputs = [incomeAmountInput, hoursPerWeekInput, otHoursInput, payFrequencySelect, filingStatusSelect, stateTaxInput, retire401kInput, medicalInsInput, otherPreTaxInput, postTaxInput];
    inputs.forEach(input => input.addEventListener('input', calculate));
    filingStatusSelect.addEventListener('change', calculate);
    
    // Toggle between hourly and salary
    incomeTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if(e.target.value === 'hourly') {
                hoursGroup.style.display = 'block';
                otGroup.style.display = 'block';
                incomeAmountInput.placeholder = "35.00";
                if(incomeAmountInput.value && incomeAmountInput.value > 1000) {
                    incomeAmountInput.value = ""; // clear if switching from salary to hourly and it's a huge number
                }
            } else {
                hoursGroup.style.display = 'none';
                otGroup.style.display = 'none';
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
        const otHours = parseFloat(otHoursInput.value) || 0;
        const payFrequency = payFrequencySelect.value;
        const filingStatus = filingStatusSelect.value;
        const stateTaxRate = (parseFloat(stateTaxInput.value) || 0) / 100;
        
        const retire401kPct = (parseFloat(retire401kInput.value) || 0) / 100;
        const medicalIns = parseFloat(medicalInsInput.value) || 0;
        const otherPreTax = parseFloat(otherPreTaxInput.value) || 0;
        const postTax = parseFloat(postTaxInput.value) || 0;

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
            // Hourly: (Amount * hours * 52) + (OT * 1.5 * Amount * 52)
            const regularAnnual = incomeAmount * hoursPerWeek * 52;
            const otAnnual = otHours * (incomeAmount * 1.5) * 52;
            annualGross = regularAnnual + otAnnual;
        }

        // Calculate Per Paycheck Gross
        const grossPerPaycheck = annualGross / periodsPerYear;
        
        const retire401kAmt = grossPerPaycheck * retire401kPct;
        const totalPreTax = retire401kAmt + medicalIns + otherPreTax;

        // Taxable Pay (after pre-tax deductions)
        const taxablePaycheck = Math.max(0, grossPerPaycheck - totalPreTax);
        const annualTaxable = taxablePaycheck * periodsPerYear;

        // FICA (7.65% flat rate for simplicity, ignoring SS cap for this lightweight estimator)
        const ficaPerPaycheck = taxablePaycheck * 0.0765;

        // State Tax
        const stateTaxPerPaycheck = taxablePaycheck * stateTaxRate;

        // Standard Deduction & Brackets (2026)
        let stdDeduction = 16100;
        let brackets = [];

        if (filingStatus === 'single') {
            stdDeduction = 16100;
            brackets = [
                { limit: 12400, rate: 0.10 },
                { limit: 50400, rate: 0.12 },
                { limit: 105700, rate: 0.22 },
                { limit: 201775, rate: 0.24 },
                { limit: 256225, rate: 0.32 },
                { limit: 640600, rate: 0.35 },
                { limit: Infinity, rate: 0.37 }
            ];
        } else if (filingStatus === 'married') {
            stdDeduction = 32200;
            brackets = [
                { limit: 24800, rate: 0.10 },
                { limit: 100800, rate: 0.12 },
                { limit: 211400, rate: 0.22 },
                { limit: 403550, rate: 0.24 },
                { limit: 512450, rate: 0.32 },
                { limit: 768700, rate: 0.35 },
                { limit: Infinity, rate: 0.37 }
            ];
        } else if (filingStatus === 'hoh') {
            stdDeduction = 24150;
            brackets = [
                { limit: 17700, rate: 0.10 },
                { limit: 67450, rate: 0.12 },
                { limit: 112850, rate: 0.22 },
                { limit: 201775, rate: 0.24 },
                { limit: 256225, rate: 0.32 },
                { limit: 640600, rate: 0.35 },
                { limit: Infinity, rate: 0.37 }
            ];
        }

        const adjustedAnnual = Math.max(0, annualTaxable - stdDeduction);
        
        let annualFedTax = 0;
        let previousLimit = 0;
        
        for (const bracket of brackets) {
            if (adjustedAnnual > previousLimit) {
                const taxableInBracket = Math.min(adjustedAnnual, bracket.limit) - previousLimit;
                annualFedTax += taxableInBracket * bracket.rate;
                previousLimit = bracket.limit;
            } else {
                break;
            }
        }

        const fedTaxPerPaycheck = annualFedTax / periodsPerYear;

        // Net Paycheck
        const netPaycheck = taxablePaycheck - fedTaxPerPaycheck - ficaPerPaycheck - stateTaxPerPaycheck - postTax;

        // Update UI
        outGross.textContent = formatCurrency(grossPerPaycheck);
        
        row401k.style.display = retire401kAmt > 0 ? 'flex' : 'none';
        out401k.textContent = `-${formatCurrency(retire401kAmt)}`;

        rowMedical.style.display = medicalIns > 0 ? 'flex' : 'none';
        outMedical.textContent = `-${formatCurrency(medicalIns)}`;

        rowOtherPreTax.style.display = otherPreTax > 0 ? 'flex' : 'none';
        outOtherPreTax.textContent = `-${formatCurrency(otherPreTax)}`;

        rowPostTax.style.display = postTax > 0 ? 'flex' : 'none';
        outPostTax.textContent = `-${formatCurrency(postTax)}`;

        outTaxable.textContent = formatCurrency(taxablePaycheck);
        outFederal.textContent = `-${formatCurrency(fedTaxPerPaycheck)}`;
        outFICA.textContent = `-${formatCurrency(ficaPerPaycheck)}`;
        outState.textContent = `-${formatCurrency(stateTaxPerPaycheck)}`;
        outNet.textContent = formatCurrency(netPaycheck);
    }
    
    // Initial calc
    calculate();
});
