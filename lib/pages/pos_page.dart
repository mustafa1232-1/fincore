import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'data_module_page.dart';

class PosPage extends StatelessWidget {
  const PosPage({super.key});

  @override
  Widget build(BuildContext context) {
    return DataModulePage(
      title: 'POS & Invoices',
      subtitle: 'Sales invoices with auto-journal integration.',
      columns: const ['invoice_number', 'customer_name', 'type', 'status', 'total_amount'],
      loader: () async {
        final rows = await ApiService.instance.fetchInvoices();
        return rows
            .map(
              (row) => {
                'invoice_number': row['invoice_number'],
                'customer_name': row['customer_name'] ?? '',
                'type': row['type'],
                'status': row['status'],
                'total_amount': row['total_amount'],
              },
            )
            .toList();
      },
    );
  }
}
