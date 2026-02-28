import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'data_module_page.dart';

class FinancialStatementsPage extends StatelessWidget {
  const FinancialStatementsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final from = DateTime(
      now.year,
      now.month,
      1,
    ).toIso8601String().substring(0, 10);
    final to = now.toIso8601String().substring(0, 10);

    return DataModulePage(
      title: 'Financial Statements',
      subtitle: 'Income statement summary with key profitability ratios.',
      columns: const ['metric', 'value'],
      loader: () async {
        final json = await ApiService.instance.fetchIncomeStatement(
          from: from,
          to: to,
        );
        final totals = json['totals'] as Map<String, dynamic>? ?? {};

        return [
          {'metric': 'Total Revenue', 'value': totals['totalRevenue'] ?? 0},
          {'metric': 'Total Cost', 'value': totals['totalCost'] ?? 0},
          {'metric': 'Gross Profit', 'value': totals['grossProfit'] ?? 0},
          {'metric': 'Total Expenses', 'value': totals['totalExpenses'] ?? 0},
          {'metric': 'Net Profit', 'value': totals['netProfit'] ?? 0},
          {'metric': 'Gross Margin %', 'value': totals['grossMargin'] ?? 0},
          {'metric': 'Net Margin %', 'value': totals['netMargin'] ?? 0},
          {'metric': 'Expense Ratio %', 'value': totals['expenseRatio'] ?? 0},
        ];
      },
    );
  }
}
