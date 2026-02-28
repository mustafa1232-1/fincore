import 'package:flutter/material.dart';

class CommandPaletteAction {
  const CommandPaletteAction({
    required this.title,
    required this.route,
    required this.description,
  });

  final String title;
  final String route;
  final String description;
}

Future<CommandPaletteAction?> showCommandPalette(
  BuildContext context,
  List<CommandPaletteAction> actions,
) {
  return showDialog<CommandPaletteAction>(
    context: context,
    builder: (context) => _CommandPaletteDialog(actions: actions),
  );
}

class _CommandPaletteDialog extends StatefulWidget {
  const _CommandPaletteDialog({required this.actions});

  final List<CommandPaletteAction> actions;

  @override
  State<_CommandPaletteDialog> createState() => _CommandPaletteDialogState();
}

class _CommandPaletteDialogState extends State<_CommandPaletteDialog> {
  String query = '';

  @override
  Widget build(BuildContext context) {
    final filtered = widget.actions
        .where((action) =>
            action.title.toLowerCase().contains(query.toLowerCase()) ||
            action.description.toLowerCase().contains(query.toLowerCase()))
        .toList();

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 70),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 680, maxHeight: 560),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            children: [
              TextField(
                autofocus: true,
                decoration: const InputDecoration(
                  hintText: 'Type a command...',
                  prefixIcon: Icon(Icons.keyboard_command_key_rounded),
                ),
                onChanged: (value) => setState(() => query = value),
              ),
              const SizedBox(height: 10),
              Expanded(
                child: ListView.separated(
                  itemBuilder: (context, index) {
                    final item = filtered[index];
                    return ListTile(
                      dense: true,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      title: Text(item.title),
                      subtitle: Text(item.description),
                      onTap: () => Navigator.of(context).pop(item),
                    );
                  },
                  separatorBuilder: (context, index) => const Divider(height: 4),
                  itemCount: filtered.length,
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
