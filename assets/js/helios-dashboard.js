/**
 * Payroll Nexus Dashboard Script
 * Backward Compatibility Shim: Ensures legacy references load payroll-nexus-dashboard.js seamlessly.
 */
(function() {
    if (!document.querySelector('script[src*="payroll-nexus-dashboard.js"]')) {
        var s = document.createElement('script');
        s.src = 'assets/js/payroll-nexus-dashboard.js?v=' + Date.now();
        s.defer = true;
        document.head.appendChild(s);
    }
})();
