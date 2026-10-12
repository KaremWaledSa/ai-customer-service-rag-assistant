import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/themes/app_theme.dart';
import 'data/services/api_service.dart';
import 'data/services/auth_service.dart';
import 'data/services/websocket_service.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/inbox/providers/inbox_provider.dart';
import 'features/knowledge/providers/knowledge_provider.dart';
import 'features/auth/presentation/screens/login_screen.dart';
import 'features/home/presentation/screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize services
  final apiService = ApiService();
  final authService = AuthService(apiService);
  final websocketService = WebSocketService();

  runApp(
    MultiProvider(
      providers: [
        Provider<ApiService>.value(value: apiService),
        Provider<AuthService>.value(value: authService),
        Provider<WebSocketService>.value(value: websocketService),
        ChangeNotifierProvider(create: (_) => AuthProvider(authService)),
        ChangeNotifierProvider(create: (_) => InboxProvider(apiService, websocketService)),
        ChangeNotifierProvider(create: (_) => KnowledgeProvider(apiService)),
      ],
      child: const NutritionAssistantApp(),
    ),
  );
}

class NutritionAssistantApp extends StatelessWidget {
  const NutritionAssistantApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'مساعد التغذية',
      debugShowCheckedModeBanner: false,

      // Theme
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.light,

      // RTL Support
      locale: const Locale('ar', 'SA'),
      supportedLocales: const [
        Locale('ar', 'SA'),
        Locale('en', 'US'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],

      // Initial Route
      home: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          if (authProvider.isLoading) {
            return const Scaffold(
              body: Center(
                child: CircularProgressIndicator(),
              ),
            );
          }

          if (authProvider.isAuthenticated) {
            return const HomeScreen();
          }

          return const LoginScreen();
        },
      ),
    );
  }
}
