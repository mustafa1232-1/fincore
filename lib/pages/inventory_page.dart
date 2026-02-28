import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'data_module_page.dart';

class InventoryPage extends StatelessWidget {
  const InventoryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return DataModulePage(
      title: 'Inventory',
      subtitle: 'Items, valuation and stock movement monitoring.',
      columns: const ['name', 'sku', 'cost', 'price', 'quantity_on_hand'],
      loader: () async {
        final rows = await ApiService.instance.fetchItems();
        return rows
            .map(
              (row) => {
                'name': row['name'],
                'sku': row['sku'] ?? '',
                'cost': row['cost'],
                'price': row['price'],
                'quantity_on_hand': row['quantity_on_hand'],
              },
            )
            .toList();
      },
    );
  }
}
