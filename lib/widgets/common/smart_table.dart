import 'package:data_table_2/data_table_2.dart';
import 'package:flutter/material.dart';

class SmartTable extends StatefulWidget {
  const SmartTable({
    super.key,
    required this.columns,
    required this.rows,
    this.title,
  });

  final List<String> columns;
  final List<Map<String, dynamic>> rows;
  final String? title;

  @override
  State<SmartTable> createState() => _SmartTableState();
}

class _SmartTableState extends State<SmartTable> {
  String _query = '';
  int _page = 0;
  static const int _pageSize = 12;

  @override
  Widget build(BuildContext context) {
    final filtered = widget.rows.where((row) {
      if (_query.trim().isEmpty) {
        return true;
      }

      final text = row.values.join(' ').toLowerCase();
      return text.contains(_query.toLowerCase());
    }).toList();

    final totalPages = (filtered.length / _pageSize).ceil().clamp(1, 10 * 1000);
    final start = (_page * _pageSize).clamp(0, filtered.length);
    final end = (start + _pageSize).clamp(0, filtered.length);
    final pageRows = filtered.sublist(start, end);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    widget.title ?? 'Data Table',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                const SizedBox(width: 10),
                SizedBox(
                  width: 280,
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Filter table...',
                      isDense: true,
                      prefixIcon: Icon(Icons.search_rounded),
                    ),
                    onChanged: (value) {
                      setState(() {
                        _query = value;
                        _page = 0;
                      });
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Expanded(
              child: DataTable2(
                minWidth: 700,
                columnSpacing: 12,
                horizontalMargin: 10,
                columns: widget.columns
                    .map(
                      (column) =>
                          DataColumn2(label: Text(column), size: ColumnSize.M),
                    )
                    .toList(),
                rows: pageRows
                    .map(
                      (row) => DataRow2(
                        cells: widget.columns
                            .map(
                              (column) => DataCell(
                                Text(
                                  '${row[column] ?? ''}',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Rows ${start + 1}-$end of ${filtered.length}'),
                Row(
                  children: [
                    IconButton(
                      onPressed: _page > 0
                          ? () => setState(() {
                              _page -= 1;
                            })
                          : null,
                      icon: const Icon(Icons.chevron_left_rounded),
                    ),
                    Text('Page ${_page + 1}/$totalPages'),
                    IconButton(
                      onPressed: _page + 1 < totalPages
                          ? () => setState(() {
                              _page += 1;
                            })
                          : null,
                      icon: const Icon(Icons.chevron_right_rounded),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
