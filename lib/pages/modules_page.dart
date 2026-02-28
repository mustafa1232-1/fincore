import 'package:flutter/material.dart';

import '../services/api_service.dart';

class ModulesPage extends StatefulWidget {
  const ModulesPage({super.key});

  @override
  State<ModulesPage> createState() => _ModulesPageState();
}

class _ModulesPageState extends State<ModulesPage> {
  final ApiService _api = ApiService.instance;

  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _modules = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final json = await _api.fetchModules();
      final rows = (json['data'] as List<dynamic>? ?? [])
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList();

      if (!mounted) {
        return;
      }

      setState(() {
        _modules = rows;
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

  Future<void> _toggle(String moduleKey, bool enabled) async {
    try {
      await _api.toggleModule(moduleKey: moduleKey, enabled: enabled);
      await _load();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Module $moduleKey is now ${enabled ? 'enabled' : 'disabled'}',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_api.describeError(error))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Modules Control',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 4),
                  const Text('Enable/disable modules per tenant in real-time.'),
                ],
              ),
            ),
            FilledButton.tonalIcon(
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Refresh'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
              ? Center(child: Text(_error!))
              : Card(
                  child: ListView.separated(
                    itemCount: _modules.length,
                    separatorBuilder: (context, index) =>
                        const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final module = _modules[index];
                      final key = module['key'] as String? ?? '';
                      final name = module['name'] as String? ?? key;
                      final enabled = module['enabled'] == true;

                      return SwitchListTile(
                        value: enabled,
                        onChanged: (value) => _toggle(key, value),
                        title: Text(name),
                        subtitle: Text(key),
                        secondary: Icon(
                          enabled
                              ? Icons.toggle_on_rounded
                              : Icons.toggle_off_rounded,
                          color: enabled
                              ? Theme.of(context).colorScheme.primary
                              : Colors.grey,
                          size: 30,
                        ),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }
}
