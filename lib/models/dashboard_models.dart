class DashboardKpi {
  const DashboardKpi({
    required this.key,
    required this.title,
    required this.value,
    required this.targetRoute,
  });

  final String key;
  final String title;
  final num value;
  final String targetRoute;
}

class DashboardPoint {
  const DashboardPoint({
    required this.month,
    required this.revenue,
    required this.profit,
    required this.expense,
  });

  final String month;
  final num revenue;
  final num profit;
  final num expense;
}

class DashboardOverview {
  const DashboardOverview({
    required this.revenue,
    required this.cost,
    required this.expense,
    required this.profit,
    required this.growth,
    required this.kpis,
    required this.history,
  });

  final num revenue;
  final num cost;
  final num expense;
  final num profit;
  final num growth;
  final List<DashboardKpi> kpis;
  final List<DashboardPoint> history;

  factory DashboardOverview.fromJson(Map<String, dynamic> json) {
    final kpisJson = json['insightCards'] as List<dynamic>? ?? [];
    final historyJson = json['history'] as List<dynamic>? ?? [];
    final kpiValues = json['kpis'] as Map<String, dynamic>? ?? {};

    return DashboardOverview(
      revenue: (kpiValues['revenue'] as num?) ?? 0,
      cost: (kpiValues['cost'] as num?) ?? 0,
      expense: (kpiValues['expense'] as num?) ?? 0,
      profit: (kpiValues['profit'] as num?) ?? 0,
      growth: (kpiValues['growth'] as num?) ?? 0,
      kpis: kpisJson
          .map(
            (entry) => DashboardKpi(
              key: entry['key'] as String? ?? '',
              title: entry['title'] as String? ?? '',
              value: (entry['value'] as num?) ?? 0,
              targetRoute: entry['targetRoute'] as String? ?? '/dashboard',
            ),
          )
          .toList(),
      history: historyJson
          .map(
            (entry) => DashboardPoint(
              month: entry['month'] as String? ?? '',
              revenue: (entry['revenue'] as num?) ?? 0,
              profit: (entry['profit'] as num?) ?? 0,
              expense: (entry['expense'] as num?) ?? 0,
            ),
          )
          .toList(),
    );
  }
}
