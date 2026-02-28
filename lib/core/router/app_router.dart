import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../pages/accounting_page.dart';
import '../../pages/budget_page.dart';
import '../../pages/dashboard_page.dart';
import '../../pages/financial_statements_page.dart';
import '../../pages/forecast_page.dart';
import '../../pages/inventory_page.dart';
import '../../pages/login_page.dart';
import '../../pages/modules_page.dart';
import '../../pages/pos_page.dart';
import '../../pages/reports_page.dart';
import '../../pages/search_page.dart';
import '../../pages/settings_page.dart';
import '../../pages/trial_balance_page.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/layout/app_shell.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isLogin = state.matchedLocation == '/login';

      if (auth.loading) {
        return null;
      }

      if (!auth.isAuthenticated && !isLogin) {
        return '/login';
      }

      if (auth.isAuthenticated && isLogin) {
        return '/dashboard';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => AppShell(
          currentRoute: state.matchedLocation,
          child: child,
        ),
        routes: [
          GoRoute(path: '/dashboard', builder: (context, state) => const DashboardPage()),
          GoRoute(path: '/accounting', builder: (context, state) => const AccountingPage()),
          GoRoute(path: '/trial-balance', builder: (context, state) => const TrialBalancePage()),
          GoRoute(
            path: '/financial-statements',
            builder: (context, state) => const FinancialStatementsPage(),
          ),
          GoRoute(path: '/budget', builder: (context, state) => const BudgetPage()),
          GoRoute(path: '/forecast', builder: (context, state) => const ForecastPage()),
          GoRoute(path: '/inventory', builder: (context, state) => const InventoryPage()),
          GoRoute(path: '/pos', builder: (context, state) => const PosPage()),
          GoRoute(path: '/reports', builder: (context, state) => const ReportsPage()),
          GoRoute(path: '/modules', builder: (context, state) => const ModulesPage()),
          GoRoute(path: '/settings', builder: (context, state) => const SettingsPage()),
          GoRoute(
            path: '/search',
            builder: (context, state) => SearchPage(query: state.uri.queryParameters['q'] ?? ''),
          ),
        ],
      ),
    ],
  );
});
