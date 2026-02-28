import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/nav_item.dart';
import '../../providers/auth_provider.dart';
import '../../providers/search_provider.dart';
import '../common/command_palette.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.child, required this.currentRoute});

  final Widget child;
  final String currentRoute;

  static const navItems = <NavItem>[
    NavItem(
      label: 'Dashboard',
      route: '/dashboard',
      icon: Icons.dashboard_outlined,
    ),
    NavItem(
      label: 'Accounting',
      route: '/accounting',
      icon: Icons.account_balance_outlined,
    ),
    NavItem(
      label: 'Trial Balance',
      route: '/trial-balance',
      icon: Icons.balance_outlined,
    ),
    NavItem(
      label: 'Financials',
      route: '/financial-statements',
      icon: Icons.analytics_outlined,
    ),
    NavItem(
      label: 'Budget',
      route: '/budget',
      icon: Icons.pie_chart_outline_rounded,
    ),
    NavItem(
      label: 'Forecast',
      route: '/forecast',
      icon: Icons.timeline_outlined,
    ),
    NavItem(
      label: 'Inventory',
      route: '/inventory',
      icon: Icons.inventory_2_outlined,
    ),
    NavItem(label: 'POS', route: '/pos', icon: Icons.point_of_sale_outlined),
    NavItem(
      label: 'Reports',
      route: '/reports',
      icon: Icons.insert_chart_outlined,
    ),
    NavItem(label: 'Modules', route: '/modules', icon: Icons.widgets_outlined),
    NavItem(
      label: 'Settings',
      route: '/settings',
      icon: Icons.settings_outlined,
    ),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final search = ref.read(searchProvider.notifier);
    final isDesktop = MediaQuery.of(context).size.width >= 1100;

    final commandActions = navItems
        .map(
          (item) => CommandPaletteAction(
            title: 'Open ${item.label}',
            route: item.route,
            description: 'Navigate to ${item.label} module',
          ),
        )
        .toList();

    return Shortcuts(
      shortcuts: {
        LogicalKeySet(LogicalKeyboardKey.control, LogicalKeyboardKey.keyK):
            const _OpenCommandPaletteIntent(),
      },
      child: Actions(
        actions: {
          _OpenCommandPaletteIntent: CallbackAction<_OpenCommandPaletteIntent>(
            onInvoke: (_) async {
              final action = await showCommandPalette(context, commandActions);
              if (context.mounted && action != null) {
                context.go(action.route);
              }
              return null;
            },
          ),
        },
        child: Scaffold(
          drawer: isDesktop
              ? null
              : Drawer(child: _Sidebar(currentRoute: currentRoute)),
          body: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF0E1629), AppTheme.canvas],
              ),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  if (isDesktop)
                    SizedBox(
                      width: 272,
                      child: _Sidebar(currentRoute: currentRoute),
                    ),
                  Expanded(
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.fromLTRB(18, 14, 18, 12),
                          decoration: const BoxDecoration(
                            color: Colors.transparent,
                          ),
                          child: Row(
                            children: [
                              if (!isDesktop)
                                Builder(
                                  builder: (context) => IconButton(
                                    onPressed: () =>
                                        Scaffold.of(context).openDrawer(),
                                    icon: const Icon(
                                      Icons.menu_rounded,
                                      color: AppTheme.ink,
                                    ),
                                  ),
                                ),
                              Expanded(
                                child: TextField(
                                  onChanged: (value) => search.search(value),
                                  onSubmitted: (value) =>
                                      context.go('/search?q=$value'),
                                  decoration: const InputDecoration(
                                    hintText:
                                        'Global Search: accounts, entries, invoices, items, users... ',
                                    prefixIcon: Icon(Icons.search_rounded),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              FilledButton.tonalIcon(
                                onPressed: () async {
                                  final action = await showCommandPalette(
                                    context,
                                    commandActions,
                                  );
                                  if (context.mounted && action != null) {
                                    context.go(action.route);
                                  }
                                },
                                icon: const Icon(
                                  Icons.keyboard_command_key_rounded,
                                ),
                                label: const Text('Ctrl + K'),
                              ),
                              const SizedBox(width: 10),
                              IconButton(
                                tooltip: 'Logout',
                                onPressed: () {
                                  ref.read(authProvider.notifier).logout();
                                  context.go('/login');
                                },
                                icon: const Icon(
                                  Icons.logout_rounded,
                                  color: AppTheme.ink,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
                            child: child,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Sidebar extends StatelessWidget {
  const _Sidebar({required this.currentRoute});

  final String currentRoute;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      color: const Color(0xFF080E1D),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: const LinearGradient(
                colors: [Color(0xFF0F766E), Color(0xFF1D4ED8)],
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.auto_graph_rounded, color: Colors.white),
                const SizedBox(width: 10),
                Text(
                  'FinCore AI ERP',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Expanded(
            child: ListView.builder(
              itemCount: AppShell.navItems.length,
              itemBuilder: (context, index) {
                final item = AppShell.navItems[index];
                final selected = currentRoute == item.route;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Material(
                    color: selected
                        ? const Color(0xFF19405A)
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                    child: ListTile(
                      dense: true,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      leading: Icon(item.icon, color: Colors.white),
                      title: Text(
                        item.label,
                        style: const TextStyle(color: Colors.white),
                      ),
                      onTap: () => context.go(item.route),
                    ),
                  ),
                );
              },
            ),
          ),
          const Divider(color: Color(0x335F7A9B)),
          const Text(
            'Enterprise Financial System\nProduction Build',
            style: TextStyle(color: Color(0xFFA7B5CB), fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _OpenCommandPaletteIntent extends Intent {
  const _OpenCommandPaletteIntent();
}
