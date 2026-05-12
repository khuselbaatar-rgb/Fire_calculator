

#include <iostream>
#include <iomanip>
#include <sstream>
#include <string>
#include <map>
#include <vector>
#include <cmath>
#include <algorithm>

static double erf_approx(double x) {
    constexpr double a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    constexpr double a4 = -1.453152027, a5 = 1.061405429, p  = 0.3275911;
    int s = (x < 0) ? -1 : 1;
    x = std::abs(x);
    double t = 1.0 / (1.0 + p * x);
    double y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1) * t * std::exp(-x*x);
    return s * y;
}

static double interp(double x, const std::vector<std::pair<double,double>>& pts) {
    if (x <= pts.front().first) return pts.front().second;
    for (std::size_t i = 1; i < pts.size(); ++i) {
        if (x <= pts[i].first) {
            double x0 = pts[i-1].first, y0 = pts[i-1].second;
            double x1 = pts[i].first,   y1 = pts[i].second;
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
        }
    }
    return pts.back().second;
}

static double gammaSteel(double t) {
    static const std::vector<std::pair<double,double>> pts = {
        {20, 1.0}, {300, 0.97}, {400, 0.85}, {500, 0.544}, {600, 0.37},
        {700, 0.22}, {800, 0.12}, {900, 0.06}, {1000, 0.03}
    };
    return interp(t, pts);
}

static double phiByLambda(double lam) {
    static const std::vector<std::pair<double,double>> pts = {
        {8, 0.98}, {10, 0.973}, {11.5, 0.965}, {15, 0.95},
        {20, 0.90}, {30, 0.80}, {40, 0.70}, {50, 0.60}
    };
    return interp(lam, pts);
}

static std::map<std::string, double> readInput() {
    std::map<std::string, double> in;
    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;
        auto eq = line.find('=');
        if (eq == std::string::npos) continue;
        std::string k = line.substr(0, eq);
        std::string v = line.substr(eq + 1);
        try { in[k] = std::stod(v); } catch (...) {}
    }
    return in;
}

static std::string num(double v, int prec = 10) {
    if (!std::isfinite(v)) return "null";
    std::ostringstream os;
    os << std::setprecision(prec) << v;
    return os.str();
}

static double get(const std::map<std::string,double>& m, const std::string& k, double def = 0.0) {
    auto it = m.find(k);
    return (it == m.end()) ? def : it->second;
}

struct StepResult {
    double tau, root, ts1, ts2, g1, g2, delta, Nu;
    bool   ok;
};

static StepResult computeStep(double tau,
                              double b, double h, double c1, double c2,
                              double Rbn, double Rsn, double As1, double As2,
                              double t0, double Np, double phi,
                              double aRed, double kbS) {
    StepResult r{};
    r.tau   = tau;
    r.root  = (tau == 0.0) ? 0.0 : 2.0 * std::sqrt(std::max(aRed, 0.0) * tau * 60.0);
    r.ts1   = t0;  r.ts2 = t0;
    r.g1    = 1.0; r.g2  = 1.0;
    r.delta = 0.0;

    if (tau > 0.0) {
        auto clamp01 = [](double v){ return std::max(0.0, std::min(1.0, v)); };
        const double thetaX1 = clamp01(erf_approx((kbS + c1)/r.root) + erf_approx((kbS + b - c1)/r.root) - 1.0);
        const double thetaY1 = clamp01(erf_approx((kbS + c1)/r.root) + erf_approx((kbS + h - c1)/r.root) - 1.0);
        
        
        r.ts1 = 1250.0 - (1250.0 - t0) * thetaX1 * thetaY1;
        r.g1  = gammaSteel(r.ts1);
        
        if (As2 > 0) {
            const double thetaX2 = clamp01(erf_approx((kbS + c2)/r.root) + erf_approx((kbS + b - c2)/r.root) - 1.0);
            const double thetaY2 = clamp01(erf_approx((kbS + c2)/r.root) + erf_approx((kbS + h - c2)/r.root) - 1.0);
            r.ts2 = 1250.0 - (1250.0 - t0) * thetaX2 * thetaY2;
            r.g2  = gammaSteel(r.ts2);
        }
        
        r.delta = std::max(0.0, std::min(std::min(b, h)/2.0 - 1.0,
                                         0.3807 * r.root - kbS));
    }
    const double bb = std::max(1.0, b - 2.0 * r.delta);
    const double hh = std::max(1.0, h - 2.0 * r.delta);
    r.Nu = phi * (Rbn*bb*hh + (r.g1*Rsn)*As1 + (r.g2*Rsn)*As2) * 1.0e-3;
    r.ok = (r.Nu >= Np);
    return r;
}

int main() {
    auto in = readInput();

    const double b   = get(in, "b");
    const double h   = get(in, "h");
    const double H0  = get(in, "H0");
    const double kL  = get(in, "kL");
    const double c1  = get(in, "c1");
    const double c2  = get(in, "c2");
    const double Rbn = get(in, "Rbn");
    const double Rsn = get(in, "Rsn");
    const double rho = get(in, "rho");
    const double W   = get(in, "W");
    const double tb  = get(in, "tb");
    const double t0  = get(in, "t0");
    const double As1 = get(in, "As1");
    const double As2 = get(in, "As2");
    const double Np  = get(in, "Np");
    const double step = get(in, "step", 30.0);
    const double tmax = get(in, "tmax", 180.0);

    const bool   hasManualPhi = in.count("phiManual") > 0;
    const double phiManual    = hasManualPhi ? in["phiManual"] : 0.0;

    constexpr double lambda0 = 1.14, aLambda = -0.00055;
    constexpr double c0      = 710.0, ac      = 0.84;
    const double lambdaTem = lambda0 + aLambda * tb;
    const double cTem      = c0      + ac      * tb;
    const double aRed_m2s  = lambdaTem / ((cTem + 50.0 * W) * rho);
    const double aRed      = aRed_m2s * 1.0e6;
    constexpr double kb    = 37.2;
    const double kbS       = kb * std::sqrt(std::max(aRed, 0.0));

    const double l0     = kL * H0;
    const double lambda = l0 / std::min(b, h);
    const double phi    = hasManualPhi ? phiManual : phiByLambda(lambda);
    const double N0     = phi * (Rbn*b*h + Rsn*As1 + Rsn*As2) * 1.0e-3;

    std::vector<double> times;
    for (double tau = 0; tau <= tmax + 1e-9; tau += step) times.push_back(tau);
    if (times.empty() || std::abs(times.back() - tmax) > 1e-9) times.push_back(tmax);
    
    
    std::vector<double> chartTimes;
    for (double tau = 0; tau <= tmax + 1e-9; tau += 1.0) chartTimes.push_back(tau);

    std::ostringstream out;
    out << "{";
    out << "\"lambdaTem\":" << num(lambdaTem) << ",";
    out << "\"cTem\":"      << num(cTem)      << ",";
    out << "\"aRed\":"      << num(aRed)      << ",";
    out << "\"kbS\":"       << num(kbS)       << ",";
    out << "\"l0\":"        << num(l0)        << ",";
    out << "\"lambda\":"    << num(lambda)    << ",";
    out << "\"phi\":"       << num(phi)       << ",";
    out << "\"phiManual\":" << (hasManualPhi ? "true" : "false") << ",";
    out << "\"N0\":"        << num(N0)        << ",";
    out << "\"Np\":"        << num(Np)        << ",";
    out << "\"N0pass\":"    << (N0 >= Np ? "true" : "false") << ",";
    out << "\"rows\":[";

    bool first = true;
    int  failIdx = -1;
    std::vector<double> Nus;
    Nus.reserve(times.size());

    for (std::size_t i = 0; i < times.size(); ++i) {
        const StepResult r = computeStep(times[i], b, h, c1, c2, Rbn, Rsn, As1, As2,
                                         t0, Np, phi, aRed, kbS);
        if (!r.ok && failIdx < 0) failIdx = static_cast<int>(i);
        Nus.push_back(r.Nu);

        if (!first) out << ",";
        first = false;
        out << "{"
            << "\"tau\":"   << num(r.tau)   << ","
            << "\"root\":"  << num(r.root)  << ","
            << "\"ts1\":"   << num(r.ts1)   << ","
            << "\"ts2\":"   << num(r.ts2)   << ","
            << "\"g1\":"    << num(r.g1)    << ","
            << "\"g2\":"    << num(r.g2)    << ","
            << "\"delta\":" << num(r.delta) << ","
            << "\"Nu\":"    << num(r.Nu)    << ","
            << "\"ok\":"    << (r.ok ? "true" : "false")
            << "}";
    }
    out << "],";

    out << "\"chartRows\":[";
    bool firstC = true;
    for (double tau = 0.0; tau <= tmax + 1e-9; tau += 1.0) {
        const StepResult r = computeStep(tau, b, h, c1, c2, Rbn, Rsn, As1, As2,
                                         t0, Np, phi, aRed, kbS);
        if (!firstC) out << ",";
        firstC = false;
        out << "{"
            << "\"tau\":"   << num(r.tau)   << ","
            << "\"Nu\":"    << num(r.Nu)    << ","
            << "\"ts1\":"   << num(r.ts1)   << ","
            << "\"ts2\":"   << num(r.ts2)   << ","
            << "\"delta\":" << num(r.delta) << ","
            << "\"ok\":"    << (r.ok ? "true" : "false")
            << "}";
    }
    out << "],";

    std::string verdict = "more";
    double tExact = -1.0;
    if (failIdx == 0) {
        verdict = "zero";
    } else if (failIdx > 0) {
        const double prevTau = times[failIdx - 1], prevNu = Nus[failIdx - 1];
        const double curTau  = times[failIdx],     curNu  = Nus[failIdx];
        if (curNu != prevNu)
            tExact = prevTau + (Np - prevNu) * (curTau - prevTau) / (curNu - prevNu);
        verdict = "approx";
    }

    out << "\"verdict\":\"" << verdict     << "\",";
    out << "\"tExact\":"    << num(tExact) << ",";
    out << "\"tauLast\":"   << num(times.back());
    out << "}";

    std::cout << out.str() << std::endl;
    return 0;
}
