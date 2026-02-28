import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'data_module_page.dart';

class BudgetPage extends StatelessWidget {
  const BudgetPage({super.key});

  @override
  Widget build(BuildContext context) {
    return DataModulePage(
      title: 'Budgeting',
      subtitle: 'Target profit, required sales and smart distribution.',
      columns: const ['name', 'period', 'target_profit', 'required_sales', 'projected_profit'],
      loader: () async {
        final rows = await ApiService.instance.fetchBudgets();
        return rows
            .map(
              (row) => {
                'name': row['name'],
                'period': '${row['period_start']} -> ${row['period_end']}',
                'target_profit': row['target_profit'],
                'required_sales': row['required_sales'],
                'projected_profit': row['projected_profit'],
              },
            )
            .toList();
      },
    );
  }
}
