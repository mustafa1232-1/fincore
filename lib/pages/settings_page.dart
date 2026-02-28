import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/draft_provider.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  late final TextEditingController _companyController;
  late final TextEditingController _currencyController;
  late final TextEditingController _countryController;

  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  ConnectivityResult _status = ConnectivityResult.wifi;

  @override
  void initState() {
    super.initState();

    final drafts = ref.read(draftProvider.notifier);
    _companyController = TextEditingController(
      text: drafts.getValue('company_name'),
    );
    _currencyController = TextEditingController(
      text: drafts.getValue('currency'),
    );
    _countryController = TextEditingController(
      text: drafts.getValue('country'),
    );

    _connectivitySubscription = Connectivity().onConnectivityChanged.listen(
      (results) => setState(() => _status = results.first),
    );
  }

  @override
  void dispose() {
    _companyController.dispose();
    _currencyController.dispose();
    _countryController.dispose();
    _connectivitySubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final drafts = ref.watch(draftProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Settings', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 4),
        Text('Smart forms with Auto Save Drafts + Undo + Offline awareness.'),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      _status == ConnectivityResult.none
                          ? Icons.cloud_off_rounded
                          : Icons.cloud_done_rounded,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _status == ConnectivityResult.none
                          ? 'Offline mode: changes stored locally and synced later.'
                          : 'Online mode: real-time sync enabled.',
                    ),
                    const Spacer(),
                    FilledButton.tonalIcon(
                      onPressed: () async {
                        await ref.read(draftProvider.notifier).undo();
                        final notifier = ref.read(draftProvider.notifier);
                        _companyController.text = notifier.getValue(
                          'company_name',
                        );
                        _currencyController.text = notifier.getValue(
                          'currency',
                        );
                        _countryController.text = notifier.getValue('country');
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Undo last change.')),
                          );
                        }
                      },
                      icon: const Icon(Icons.undo_rounded),
                      label: const Text('Undo'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _companyController,
                  onChanged: (value) => ref
                      .read(draftProvider.notifier)
                      .saveField('company_name', value),
                  decoration: const InputDecoration(
                    labelText: 'Company Name',
                    helperText: 'Auto saved',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _currencyController,
                  onChanged: (value) => ref
                      .read(draftProvider.notifier)
                      .saveField('currency', value),
                  decoration: const InputDecoration(
                    labelText: 'Currency',
                    helperText: 'Auto saved',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _countryController,
                  onChanged: (value) => ref
                      .read(draftProvider.notifier)
                      .saveField('country', value),
                  decoration: const InputDecoration(
                    labelText: 'Country',
                    helperText: 'Auto saved',
                  ),
                ),
                const SizedBox(height: 10),
                Text('Draft fields in memory: ${drafts.values.length}'),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
