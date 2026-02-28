import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

Future<String> saveExcelFile({
  required List<int> bytes,
  required String fileName,
}) async {
  final directory = await getTemporaryDirectory();
  final file = File('${directory.path}${Platform.pathSeparator}$fileName');

  await file.writeAsBytes(bytes, flush: true);

  await SharePlus.instance.share(
    ShareParams(
      files: [XFile(file.path)],
      subject: fileName,
      text: 'FinCore ERP Excel export',
    ),
  );

  return file.path;
}
