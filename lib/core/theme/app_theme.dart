import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color canvas = Color(0xFF0B1020);
  static const Color surface = Color(0xFF121A2B);
  static const Color ink = Color(0xFFE6ECF8);
  static const Color muted = Color(0xFF9FB0CE);
  static const Color primary = Color(0xFF00A389);
  static const Color accent = Color(0xFFFF8A1F);
  static const Color positive = Color(0xFF16A34A);
  static const Color negative = Color(0xFFDC2626);

  static ThemeData build() {
    final baseText = GoogleFonts.manropeTextTheme();

    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: canvas,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: accent,
        surface: surface,
        onSurface: ink,
        onPrimary: Color(0xFF04110E),
        onSecondary: Color(0xFF291500),
        error: negative,
      ),
      textTheme: baseText.copyWith(
        headlineLarge: baseText.headlineLarge?.copyWith(
          fontWeight: FontWeight.w900,
          color: ink,
        ),
        headlineMedium: baseText.headlineMedium?.copyWith(
          fontWeight: FontWeight.w800,
          color: ink,
        ),
        titleLarge: baseText.titleLarge?.copyWith(
          fontWeight: FontWeight.w800,
          color: ink,
        ),
        titleMedium: baseText.titleMedium?.copyWith(
          fontWeight: FontWeight.w700,
          color: ink,
        ),
        bodyLarge: baseText.bodyLarge?.copyWith(
          color: ink,
          fontWeight: FontWeight.w700,
        ),
        bodyMedium: baseText.bodyMedium?.copyWith(
          color: muted,
          fontWeight: FontWeight.w700,
        ),
        labelLarge: baseText.labelLarge?.copyWith(
          color: ink,
          fontWeight: FontWeight.w800,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 2,
        color: surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF1A2439),
        hintStyle: const TextStyle(color: muted, fontWeight: FontWeight.w700),
        labelStyle: const TextStyle(color: muted, fontWeight: FontWeight.w700),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFF33415D)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFF33415D)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: primary, width: 1.4),
        ),
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: Color(0xFF151D30),
        contentTextStyle: TextStyle(color: ink, fontWeight: FontWeight.w700),
      ),
    );
  }
}
