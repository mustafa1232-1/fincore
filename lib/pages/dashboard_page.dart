import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../models/dashboard_models.dart';
import '../providers/dashboard_provider.dart';
import '../services/api_service.dart';
import '../widgets/common/kpi_card.dart';

class DashboardPage extends ConsumerStatefulWidget {
  const DashboardPage({super.key});

  @override
  ConsumerState<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends ConsumerState<DashboardPage> {
  final _aiController = TextEditingController();
  String? _aiResponse;
  bool _aiLoading = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(dashboardProvider.notifier).load());
  }

  @override
  void dispose() {
    _aiController.dispose();
    super.dispose();
  }

  Future<void> _askAi() async {
    final prompt = _aiController.text.trim();
    if (prompt.isEmpty) {
      return;
    }

    setState(() {
      _aiLoading = true;
      _aiResponse = null;
    });

    try {
      final result = await ApiService.instance.askAi(prompt);
      if (!mounted) {
        return;
      }
      setState(() {
        _aiResponse = result['answer'] as String? ?? 'No response';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _aiResponse = ApiService.instance.describeError(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _aiLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(dashboardProvider);

    if (state.loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null) {
      return Center(child: Text(state.error!));
    }

    final data = state.data;
    if (data == null) {
      return const Center(child: Text('No dashboard data yet.'));
    }

    final currency = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 1100;
        final kpiWidth = compact ? constraints.maxWidth : 260.0;

        return ListView(
          physics: const BouncingScrollPhysics(),
          children: [
            Text(
              'Smart Dashboard',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 4),
            const Text('Interactive KPI cards and AI financial insights'),
            const SizedBox(height: 14),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: data.kpis
                  .map(
                    (kpi) => SizedBox(
                      width: kpiWidth,
                      child: KpiCard(
                        title: kpi.title,
                        value: currency.format(kpi.value),
                        change: data.growth,
                        onTap: () => context.go(kpi.targetRoute),
                      ),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 14),
            if (compact) ...[
              SizedBox(height: 310, child: _TrendCard(data: data)),
              const SizedBox(height: 12),
              SizedBox(
                height: 380,
                child: _AiAssistantCard(
                  controller: _aiController,
                  loading: _aiLoading,
                  response: _aiResponse,
                  onAsk: _askAi,
                ),
              ),
            ] else ...[
              SizedBox(
                height: 420,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(flex: 3, child: _TrendCard(data: data)),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: _AiAssistantCard(
                        controller: _aiController,
                        loading: _aiLoading,
                        response: _aiResponse,
                        onAsk: _askAi,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 20),
          ],
        );
      },
    );
  }
}

class _TrendCard extends StatelessWidget {
  const _TrendCard({required this.data});

  final DashboardOverview data;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Revenue vs Profit Trend',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 14),
            Expanded(
              child: LineChart(
                LineChartData(
                  gridData: const FlGridData(show: true),
                  borderData: FlBorderData(show: false),
                  titlesData: FlTitlesData(
                    leftTitles: const AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                      ),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final index = value.toInt();
                          if (index < 0 || index >= data.history.length) {
                            return const SizedBox.shrink();
                          }
                          return Text(
                            data.history[index].month.substring(5),
                            style: const TextStyle(fontSize: 10),
                          );
                        },
                      ),
                    ),
                  ),
                  lineBarsData: [
                    LineChartBarData(
                      isCurved: true,
                      color: const Color(0xFF0F766E),
                      barWidth: 3,
                      spots: List.generate(
                        data.history.length,
                        (index) => FlSpot(
                          index.toDouble(),
                          data.history[index].revenue.toDouble(),
                        ),
                      ),
                    ),
                    LineChartBarData(
                      isCurved: true,
                      color: const Color(0xFFF97316),
                      barWidth: 3,
                      spots: List.generate(
                        data.history.length,
                        (index) => FlSpot(
                          index.toDouble(),
                          data.history[index].profit.toDouble(),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AiAssistantCard extends StatelessWidget {
  const _AiAssistantCard({
    required this.controller,
    required this.loading,
    required this.response,
    required this.onAsk,
  });

  final TextEditingController controller;
  final bool loading;
  final String? response;
  final VoidCallback onAsk;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'AI CFO Assistant',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            const Text(
              'Ask with real data. Example: How much sales to reach 10,000 profit?',
            ),
            const SizedBox(height: 10),
            TextField(
              controller: controller,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Type your question...',
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: loading ? null : onAsk,
                child: loading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Analyze'),
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF111B2E),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF2D3B58)),
                ),
                child: SingleChildScrollView(
                  child: Text(response ?? 'No analysis yet.'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
