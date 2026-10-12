import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/themes/app_theme.dart';
import '../../../../data/services/websocket_service.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../../inbox/providers/inbox_provider.dart';
import '../../../inbox/presentation/screens/inbox_screen.dart';
import '../../../knowledge/presentation/screens/knowledge_screen.dart';
import '../../../settings/presentation/screens/settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    InboxScreen(),
    KnowledgeScreen(),
    SettingsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    // Delay initialization to after the first frame to avoid setState during build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeApp();
    });
  }

  void _initializeApp() {
    // Connect WebSocket
    final authProvider = context.read<AuthProvider>();
    final wsService = context.read<WebSocketService>();
    wsService.connect(authProvider.user?['id']?.toString());

    // Fetch initial data
    context.read<InboxProvider>().fetchPendingMessages();
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: IndexedStack(
          index: _currentIndex,
          children: _screens,
        ),
        bottomNavigationBar: Consumer<InboxProvider>(
          builder: (context, inbox, _) {
            return BottomNavigationBar(
              currentIndex: _currentIndex,
              onTap: (index) {
                setState(() {
                  _currentIndex = index;
                });
              },
              items: [
                BottomNavigationBarItem(
                  icon: Badge(
                    isLabelVisible: inbox.pendingCount > 0,
                    label: Text(inbox.pendingCount.toString()),
                    backgroundColor: AppTheme.errorColor,
                    child: const Icon(Icons.inbox_outlined),
                  ),
                  activeIcon: Badge(
                    isLabelVisible: inbox.pendingCount > 0,
                    label: Text(inbox.pendingCount.toString()),
                    backgroundColor: AppTheme.errorColor,
                    child: const Icon(Icons.inbox),
                  ),
                  label: 'الوارد',
                ),
                const BottomNavigationBarItem(
                  icon: Icon(Icons.auto_stories_outlined),
                  activeIcon: Icon(Icons.auto_stories),
                  label: 'المعرفة',
                ),
                const BottomNavigationBarItem(
                  icon: Icon(Icons.settings_outlined),
                  activeIcon: Icon(Icons.settings),
                  label: 'الإعدادات',
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
