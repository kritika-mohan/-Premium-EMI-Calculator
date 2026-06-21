# EMI Loan Calculator

A complete, production-ready EMI (Equated Monthly Installment) loan calculator. Built with plain HTML, CSS, and vanilla JavaScript. Designed with a vibrant modern fintech aesthetic.

## Features
- Loan amount, interest rate, and tenure inputs via range sliders and number fields.
- Quick-fill preset chips for Home, Car, Personal, and Education loans.
- Dynamic SVG Donut ring showing principal vs interest breakdown.
- Count-up animation for EMI calculation results.
- Detailed breakdown rows formatted in Indian Rupee format.
- Expandable month-by-month schedule table.
- Accessible and fully responsive (down to 360px).

## Tech Stack
- HTML5
- Vanilla CSS3 (Custom Properties, Glassmorphism)
- Vanilla JavaScript
- No frameworks, no build steps.

## How to run locally
1. Clone the repository or download the files.
2. Open `index.html` directly in any modern web browser.
3. No server or build step required.

## EMI Formula Used
The Equated Monthly Installment (EMI) is calculated using the following formula:
`EMI = P × r × (1+r)^n / ((1+r)^n − 1)`

Where:
- `P` = Principal loan amount
- `r` = Monthly interest rate (Annual rate / 12 / 100)
- `n` = Total number of monthly installments (Tenure in months)

*Note: If the interest rate is 0%, the formula used is `EMI = P / n`.*

---
Built by Kritika Mohan
