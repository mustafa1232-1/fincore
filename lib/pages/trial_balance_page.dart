import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'data_module_page.dart';

class TrialBalancePage extends StatelessWidget {
  const TrialBalancePage({super.key});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final from = DateTime(now.year, now.month, 1).toIso8601String().substring(0, 10);
    final to = now.toIso8601String().substring(0, 10);

    return DataModulePage(
      title: 'Trial Balance',
      subtitle: 'Generated dynamically from journal entries.',
      columns: const ['code', 'name', 'debit', 'credit', 'balance'],
      loader: () async {
        final rows = await ApiService.instance.fetchTrialBalance(from: from, to: to);
        return rows
            .map(
              (row) => {
                'code': row['code'],
                'name': row['name'],
                'debit': row['debit'],
                'credit': row['credit'],
                'balance': row['balance'],
              },
            )
            .toList();
      },
    );
  }
}
