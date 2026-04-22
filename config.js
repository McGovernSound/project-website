const CONFIG = {
    githubUsername: "McGovernSound",
    repositories: [
        { repo: "mgs-expense-dist", displayName: "MGS Expense" },
        { repo: "mgs-inventory-dist", displayName: "MGS Inventory" },
        { repo: "amp-monitor-dist", displayName: "MGS Amp Monitor" },
        { repo: "Rack-Designer", displayName: "MGS Rack Designer" },
        { repo: "line-draw-desktop-dist", displayName: "MGS Signal Flow" },
        { repo: "amp-data-sheet-dist", displayName: "MGS Amp Data Sheet" },
        { type: "webapp", id: "paycheck-calculator", displayName: "MGS Paycheck Estimator", description: "Calculate your estimated take-home pay with configurable deductions and tax brackets.", path: "./paycheck-calculator/" }
    ],
    siteTitle: "MGS's Latest",
    siteSubtitle: "Download the latest versions of the MGS suite."
};

export default CONFIG;
