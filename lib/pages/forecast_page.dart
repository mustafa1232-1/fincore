import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'data_module_page.dart';

class ForecastPage extends StatelessWidget {
  const ForecastPage({super.key});

  @override
  Widget build(BuildContext context) {
    return DataModulePage(
      title: 'Forecast Engine',
      subtitle: 'Trend + growth + seasonality forecast outputs.',
      columns: const [
        'name',
        'period_type',
        'periods',
        'start_date',
        'growth_rate',
      ],
      loader: () async {
        final rows = await ApiService.instance.fetchForecasts();
        return rows
            .map(
              (row) => {
                'name': row['name'],
                'period_type': row['period_type'],
                'periods': row['periods'],
                'start_date': row['start_date'],
                'growth_rate': row['growth_rate'],
              },
            )
            .toList();
      },
    );
  }
}
