import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'data_module_page.dart';

class ModulesPage extends StatelessWidget {
  const ModulesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return DataModulePage(
      title: 'Modules Control',
      subtitle: 'Enable or disable modules per tenant with role permissions.',
      columns: const ['key', 'name', 'enabled'],
      loader: () async {
        final json = await ApiService.instance.fetchModules();
        final rows = json['data'] as List<dynamic>? ?? [];

        return rows
            .map(
              (row) => {
                'key': row['key'],
                'name': row['name'],
                'enabled': row['enabled'],
              },
            )
            .toList();
      },
    );
  }
}
