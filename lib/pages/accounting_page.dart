import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'data_module_page.dart';

class AccountingPage extends StatelessWidget {
  const AccountingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return DataModulePage(
      title: 'Accounting',
      subtitle: 'Chart of accounts with smart search, filter and pagination.',
      columns: const ['code', 'name', 'type'],
      loader: () async {
        final rows = await ApiService.instance.fetchAccounts();
        return rows
            .map(
              (row) => {
                'code': row['code'],
                'name': row['name'],
                'type': row['type'],
              },
            )
            .toList();
      },
    );
  }
}
