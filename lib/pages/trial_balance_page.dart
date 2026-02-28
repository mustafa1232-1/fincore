import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:file_saver/file_saver.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/api_service.dart';
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

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _from = DateTime(now.year, now.month, 1);
    _to = now;
    _load();
  }

  String _fmtDate(DateTime date) => DateFormat('yyyy-MM-dd').format(date);

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
        _from = picked;
      } else {
        _to = picked;
      }
    });
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final rows = await _api.fetchTrialBalance(
        from: _fmtDate(_from),
        to: _fmtDate(_to),
      );
      final accounts = await _api.fetchAccounts();

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
      await _api.importTrialBalanceExcel(
        from: _fmtDate(_from),
        to: _fmtDate(_to),
        file: file,
        postToLedger: true,
      );

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Trial balance imported from Excel.')),
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

  Future<void> _exportExcel() async {
    setState(() => _busy = true);

    try {
      final bytes = await _api.exportTrialBalanceExcel(
        from: _fmtDate(_from),
        to: _fmtDate(_to),
      );

      await FileSaver.instance.saveFile(
        name: 'trial_balance_${_fmtDate(_to)}',
        bytes: Uint8List.fromList(bytes),
        fileExtension: 'xlsx',
        mimeType: MimeType.microsoftExcel,
      );

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Trial balance exported.')));
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
        const SnackBar(content: Text('Add at least one valid manual line.')),
      );
      return;
    }

    final totalDebit = lines.fold<double>(
      0,
      (sum, line) => sum + (line['debit'] as double),
    );
    final totalCredit = lines.fold<double>(
      0,
      (sum, line) => sum + (line['credit'] as double),
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Trial Balance', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 4),
        const Text('Generate, upload, export, or fill trial balance directly.'),
        const SizedBox(height: 10),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            FilledButton.tonalIcon(
              onPressed: _loading ? null : () => _pickDate(from: true),
              icon: const Icon(Icons.event_rounded),
              label: Text('From ${_fmtDate(_from)}'),
            ),
            FilledButton.tonalIcon(
              onPressed: _loading ? null : () => _pickDate(from: false),
              icon: const Icon(Icons.event_available_rounded),
              label: Text('To ${_fmtDate(_to)}'),
            ),
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
              onPressed: (_loading || _busy) ? null : _exportExcel,
              icon: const Icon(Icons.download_rounded),
              label: const Text('Export Excel'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
              ? Center(child: Text(_error!))
              : Column(
                  children: [
                    Expanded(
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
                    const SizedBox(height: 12),
                    _ManualEntryCard(
                      accounts: _accounts,
                      manualLines: _manualLines,
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
                  ],
                ),
        ),
      ],
    );
  }
}

class _ManualEntryCard extends StatelessWidget {
  const _ManualEntryCard({
    required this.accounts,
    required this.manualLines,
    required this.busy,
    required this.onAddLine,
    required this.onDeleteLine,
    required this.onChanged,
    required this.onPost,
  });

  final List<Map<String, dynamic>> accounts;
  final List<_ManualLine> manualLines;
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

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Direct Fill Trial Balance (Journal Entry)',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                FilledButton.tonalIcon(
                  onPressed: busy ? null : onAddLine,
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Add Line'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: busy ? null : onPost,
                  child: const Text('Post Entry'),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 220),
              child: ListView.separated(
                itemCount: manualLines.length,
                separatorBuilder: (context, index) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final line = manualLines[index];

                  return Row(
                    children: [
                      Expanded(
                        flex: 6,
                        child: DropdownButtonFormField<String>(
                          initialValue: line.accountId,
                          isExpanded: true,
                          decoration: const InputDecoration(
                            labelText: 'Account',
                          ),
                          items: accountItems,
                          onChanged: (value) {
                            line.accountId = value;
                            onChanged();
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: TextFormField(
                          initialValue: line.debit == 0
                              ? ''
                              : line.debit.toString(),
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          decoration: const InputDecoration(labelText: 'Debit'),
                          onChanged: (value) {
                            line.debit = double.tryParse(value) ?? 0;
                            onChanged();
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: TextFormField(
                          initialValue: line.credit == 0
                              ? ''
                              : line.credit.toString(),
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          decoration: const InputDecoration(
                            labelText: 'Credit',
                          ),
                          onChanged: (value) {
                            line.credit = double.tryParse(value) ?? 0;
                            onChanged();
                          },
                        ),
                      ),
                      IconButton(
                        onPressed: busy ? null : () => onDeleteLine(index),
                        icon: const Icon(Icons.delete_outline_rounded),
                      ),
                    ],
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

class _ManualLine {
  String? accountId;
  double debit = 0;
  double credit = 0;
}
