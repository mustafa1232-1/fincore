import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/api_service.dart';
import '../services/file_download_service.dart';
import '../widgets/common/smart_table.dart';

class TrialBalancePage extends StatefulWidget {
  const TrialBalancePage({super.key});

  @override
  State<TrialBalancePage> createState() => _TrialBalancePageState();
}

class _TrialBalancePageState extends State<TrialBalancePage> {
  final ApiService _api = ApiService.instance;

  late DateTime _from;
  late DateTime _to;

  bool _loading = true;
  bool _busy = false;
  String? _error;

  List<Map<String, dynamic>> _rows = [];
  List<Map<String, dynamic>> _accounts = [];
  final List<_ManualLine> _manualLines = [_ManualLine()];

  bool _postImportedToLedger = true;
  String? _importSummary;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _from = DateTime(now.year, now.month, 1);
    _to = now;
    _load();
  }

  String _fmtDate(DateTime date) => DateFormat('yyyy-MM-dd').format(date);

  double get _totalDebit =>
      _rows.fold<double>(0, (sum, row) => sum + _toDouble(row['debit']));

  double get _totalCredit =>
      _rows.fold<double>(0, (sum, row) => sum + _toDouble(row['credit']));

  Future<void> _pickDate({required bool from}) async {
    final initial = from ? _from : _to;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2000, 1, 1),
      lastDate: DateTime(2100, 12, 31),
    );

    if (picked == null) {
      return;
    }

    setState(() {
      if (from) {
        _from = picked.isAfter(_to) ? _to : picked;
      } else {
        _to = picked.isBefore(_from) ? _from : picked;
      }
    });
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await Future.wait([
        _api.fetchTrialBalance(from: _fmtDate(_from), to: _fmtDate(_to)),
        _api.fetchAccounts(),
      ]);

      final rows = result[0];
      final accounts = result[1];

      if (!mounted) {
        return;
      }

      setState(() {
        _rows = rows
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
        _accounts = accounts
            .map((row) => Map<String, dynamic>.from(row as Map))
            .toList();
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = _api.describeError(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _uploadExcel() async {
    final picked = await FilePicker.platform.pickFiles(
      withData: true,
      allowMultiple: false,
      type: FileType.custom,
      allowedExtensions: const ['xlsx', 'xls'],
    );

    final file = picked?.files.firstOrNull;
    if (file == null) {
      return;
    }

    setState(() => _busy = true);

    try {
      final result = await _api.importTrialBalanceExcel(
        from: _fmtDate(_from),
        to: _fmtDate(_to),
        file: file,
        postToLedger: _postImportedToLedger,
      );

      final importedRows = result['importedRows'] ?? 0;
      final createdAccounts = result['createdAccounts'] ?? 0;
      final balanced = result['balanced'] == true;

      setState(() {
        _importSummary =
            'Imported $importedRows rows, created $createdAccounts account(s), '
            'balanced: ${balanced ? 'Yes' : 'No'}';
      });

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_importSummary!)));
      await _load();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_api.describeError(error))));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _exportExcel({required bool templateMode}) async {
    setState(() => _busy = true);

    try {
      final bytes = await _api.exportTrialBalanceExcel(
        from: _fmtDate(_from),
        to: _fmtDate(_to),
        template: templateMode,
      );

      final fileName = templateMode
          ? 'trial_balance_template_${_fmtDate(_to)}.xlsx'
          : 'trial_balance_report_${_fmtDate(_to)}.xlsx';

      await saveExcelFile(bytes: bytes, fileName: fileName);

      if (!mounted) {
        return;
      }

      final message = templateMode
          ? 'Template exported. Fill Debit/Credit then upload it.'
          : 'Trial balance report exported.';
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_api.describeError(error))));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _postManual() async {
    final lines = _manualLines
        .where(
          (line) =>
              line.accountId != null && (line.debit > 0 || line.credit > 0),
        )
        .map(
          (line) => {
            'accountId': line.accountId,
            'debit': line.debit,
            'credit': line.credit,
          },
        )
        .toList();

    if (lines.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add at least one valid line.')),
      );
      return;
    }

    final totalDebit = lines.fold<double>(
      0,
      (sum, line) => sum + _toDouble(line['debit']),
    );
    final totalCredit = lines.fold<double>(
      0,
      (sum, line) => sum + _toDouble(line['credit']),
    );

    if (totalDebit.toStringAsFixed(2) != totalCredit.toStringAsFixed(2)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Debit and Credit totals must be equal.')),
      );
      return;
    }

    setState(() => _busy = true);

    try {
      await _api.createJournalEntry(
        date: _fmtDate(_to),
        description: 'Manual trial balance entry',
        lines: lines,
      );

      if (!mounted) {
        return;
      }

      _manualLines
        ..clear()
        ..add(_ManualLine());

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Manual trial balance entry posted.')),
      );
      await _load();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_api.describeError(error))));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 920;
        final tableHeight = compact ? 410.0 : 500.0;

        return RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              _HeaderCard(
                fromDate: _fmtDate(_from),
                toDate: _fmtDate(_to),
                totalDebit: _totalDebit,
                totalCredit: _totalCredit,
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  FilledButton.tonalIcon(
                    onPressed: (_loading || _busy) ? null : _load,
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Refresh'),
                  ),
                  FilledButton.tonalIcon(
                    onPressed: (_loading || _busy) ? null : _uploadExcel,
                    icon: const Icon(Icons.upload_file_rounded),
                    label: const Text('Upload Excel'),
                  ),
                  FilledButton.tonalIcon(
                    onPressed: (_loading || _busy)
                        ? null
                        : () => _exportExcel(templateMode: true),
                    icon: const Icon(Icons.playlist_add_check_rounded),
                    label: const Text('Export Template'),
                  ),
                  FilledButton.tonalIcon(
                    onPressed: (_loading || _busy)
                        ? null
                        : () => _exportExcel(templateMode: false),
                    icon: const Icon(Icons.download_rounded),
                    label: const Text('Export Report'),
                  ),
                  FilledButton.tonalIcon(
                    onPressed: (_loading || _busy)
                        ? null
                        : () => _pickDate(from: true),
                    icon: const Icon(Icons.event_rounded),
                    label: Text('From ${_fmtDate(_from)}'),
                  ),
                  FilledButton.tonalIcon(
                    onPressed: (_loading || _busy)
                        ? null
                        : () => _pickDate(from: false),
                    icon: const Icon(Icons.event_available_rounded),
                    label: Text('To ${_fmtDate(_to)}'),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                value: _postImportedToLedger,
                title: const Text('Post imported rows to journal if balanced'),
                subtitle: const Text(
                  'If disabled, data is stored as trial-balance snapshot only.',
                ),
                onChanged: (_loading || _busy)
                    ? null
                    : (value) {
                        setState(() => _postImportedToLedger = value);
                      },
              ),
              if (_importSummary != null) ...[
                const SizedBox(height: 6),
                _NoticeCard(text: _importSummary!),
              ],
              const SizedBox(height: 12),
              if (_loading) ...[
                const SizedBox(
                  height: 240,
                  child: Center(child: CircularProgressIndicator()),
                ),
              ] else if (_error != null) ...[
                _ErrorCard(message: _error!, onRetry: _load),
              ] else ...[
                SizedBox(
                  height: tableHeight,
                  child: SmartTable(
                    title: 'Trial Balance Data',
                    columns: const [
                      'code',
                      'name',
                      'debit',
                      'credit',
                      'balance',
                    ],
                    rows: _rows,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              _ManualEntryCard(
                accounts: _accounts,
                manualLines: _manualLines,
                compact: compact,
                busy: _busy,
                onAddLine: () {
                  setState(() => _manualLines.add(_ManualLine()));
                },
                onDeleteLine: (index) {
                  if (_manualLines.length == 1) {
                    return;
                  }
                  setState(() => _manualLines.removeAt(index));
                },
                onChanged: () => setState(() {}),
                onPost: _postManual,
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({
    required this.fromDate,
    required this.toDate,
    required this.totalDebit,
    required this.totalCredit,
  });

  final String fromDate;
  final String toDate;
  final double totalDebit;
  final double totalCredit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF16233A), Color(0xFF0F1A2E)],
        ),
        border: Border.all(color: const Color(0xFF2D3D5E)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Trial Balance',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 6),
          const Text(
            'Export template with accounts, fill it, upload it, and post directly.',
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _MetricPill(label: 'Period', value: '$fromDate -> $toDate'),
              _MetricPill(
                label: 'Total Debit',
                value: totalDebit.toStringAsFixed(2),
              ),
              _MetricPill(
                label: 'Total Credit',
                value: totalCredit.toStringAsFixed(2),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MetricPill extends StatelessWidget {
  const _MetricPill({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF1C2A44),
        borderRadius: BorderRadius.circular(999),
      ),
      child: RichText(
        text: TextSpan(
          children: [
            TextSpan(
              text: '$label: ',
              style: Theme.of(
                context,
              ).textTheme.labelLarge?.copyWith(color: const Color(0xFF9FB0CE)),
            ),
            TextSpan(
              text: value,
              style: Theme.of(context).textTheme.labelLarge,
            ),
          ],
        ),
      ),
    );
  }
}

class _NoticeCard extends StatelessWidget {
  const _NoticeCard({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            const Icon(
              Icons.check_circle_outline_rounded,
              color: Color(0xFF16A34A),
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(text)),
          ],
        ),
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Unable to load trial balance',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(message),
            const SizedBox(height: 10),
            FilledButton.tonal(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

class _ManualEntryCard extends StatelessWidget {
  const _ManualEntryCard({
    required this.accounts,
    required this.manualLines,
    required this.compact,
    required this.busy,
    required this.onAddLine,
    required this.onDeleteLine,
    required this.onChanged,
    required this.onPost,
  });

  final List<Map<String, dynamic>> accounts;
  final List<_ManualLine> manualLines;
  final bool compact;
  final bool busy;
  final VoidCallback onAddLine;
  final void Function(int index) onDeleteLine;
  final VoidCallback onChanged;
  final VoidCallback onPost;

  @override
  Widget build(BuildContext context) {
    final accountItems = accounts
        .map(
          (account) => DropdownMenuItem<String>(
            value: account['id'] as String,
            child: Text('${account['code']} - ${account['name']}'),
          ),
        )
        .toList();

    final totalDebit = manualLines.fold<double>(
      0,
      (sum, line) => sum + line.debit,
    );
    final totalCredit = manualLines.fold<double>(
      0,
      (sum, line) => sum + line.credit,
    );
    final balanced =
        totalDebit.toStringAsFixed(2) == totalCredit.toStringAsFixed(2);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  'Direct Fill Trial Balance (Journal Entry)',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                FilledButton.tonalIcon(
                  onPressed: busy ? null : onAddLine,
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Add Line'),
                ),
                FilledButton(
                  onPressed: busy ? null : onPost,
                  child: const Text('Post Entry'),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 8,
              children: [
                _MetricPill(
                  label: 'Debit',
                  value: totalDebit.toStringAsFixed(2),
                ),
                _MetricPill(
                  label: 'Credit',
                  value: totalCredit.toStringAsFixed(2),
                ),
                _MetricPill(label: 'Balanced', value: balanced ? 'Yes' : 'No'),
              ],
            ),
            const SizedBox(height: 10),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 320),
              child: ListView.separated(
                itemCount: manualLines.length,
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final line = manualLines[index];
                  return _ManualLineRow(
                    key: ValueKey(line.id),
                    accountItems: accountItems,
                    line: line,
                    compact: compact,
                    busy: busy,
                    onChanged: onChanged,
                    onDelete: () => onDeleteLine(index),
                    canDelete: manualLines.length > 1,
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ManualLineRow extends StatelessWidget {
  const _ManualLineRow({
    super.key,
    required this.accountItems,
    required this.line,
    required this.compact,
    required this.busy,
    required this.onChanged,
    required this.onDelete,
    required this.canDelete,
  });

  final List<DropdownMenuItem<String>> accountItems;
  final _ManualLine line;
  final bool compact;
  final bool busy;
  final VoidCallback onChanged;
  final VoidCallback onDelete;
  final bool canDelete;

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return Column(
        children: [
          DropdownButtonFormField<String>(
            initialValue: line.accountId,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Account'),
            items: accountItems,
            onChanged: busy
                ? null
                : (value) {
                    line.accountId = value;
                    onChanged();
                  },
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  initialValue: line.debit == 0 ? '' : line.debit.toString(),
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: const InputDecoration(labelText: 'Debit'),
                  onChanged: busy
                      ? null
                      : (value) {
                          line.debit = _toDouble(value);
                          onChanged();
                        },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextFormField(
                  initialValue: line.credit == 0 ? '' : line.credit.toString(),
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: const InputDecoration(labelText: 'Credit'),
                  onChanged: busy
                      ? null
                      : (value) {
                          line.credit = _toDouble(value);
                          onChanged();
                        },
                ),
              ),
              IconButton(
                onPressed: (!busy && canDelete) ? onDelete : null,
                icon: const Icon(Icons.delete_outline_rounded),
              ),
            ],
          ),
        ],
      );
    }

    return Row(
      children: [
        Expanded(
          flex: 6,
          child: DropdownButtonFormField<String>(
            initialValue: line.accountId,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Account'),
            items: accountItems,
            onChanged: busy
                ? null
                : (value) {
                    line.accountId = value;
                    onChanged();
                  },
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 2,
          child: TextFormField(
            initialValue: line.debit == 0 ? '' : line.debit.toString(),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Debit'),
            onChanged: busy
                ? null
                : (value) {
                    line.debit = _toDouble(value);
                    onChanged();
                  },
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 2,
          child: TextFormField(
            initialValue: line.credit == 0 ? '' : line.credit.toString(),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Credit'),
            onChanged: busy
                ? null
                : (value) {
                    line.credit = _toDouble(value);
                    onChanged();
                  },
          ),
        ),
        IconButton(
          onPressed: (!busy && canDelete) ? onDelete : null,
          icon: const Icon(Icons.delete_outline_rounded),
        ),
      ],
    );
  }
}

class _ManualLine {
  _ManualLine();

  final String id = UniqueKey().toString();
  String? accountId;
  double debit = 0;
  double credit = 0;
}

double _toDouble(Object? value) {
  if (value == null) {
    return 0;
  }
  if (value is num) {
    return value.toDouble();
  }
  if (value is String) {
    return double.tryParse(value.trim()) ?? 0;
  }
  return 0;
}
