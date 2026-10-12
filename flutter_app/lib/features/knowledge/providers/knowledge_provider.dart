import 'package:flutter/foundation.dart';
import '../../../core/constants/api_constants.dart';
import '../../../data/models/knowledge_entry.dart';
import '../../../data/services/api_service.dart';

class KnowledgeProvider with ChangeNotifier {
  final ApiService _apiService;

  List<KnowledgeEntry> _entries = [];
  List<KnowledgeEntry> _searchResults = [];
  Map<String, int> _stats = {};
  bool _isLoading = false;
  bool _isSearching = false;
  String? _error;
  int _total = 0;
  int _page = 1;

  KnowledgeProvider(this._apiService);

  List<KnowledgeEntry> get entries => _entries;
  List<KnowledgeEntry> get searchResults => _searchResults;
  Map<String, int> get stats => _stats;
  bool get isLoading => _isLoading;
  bool get isSearching => _isSearching;
  String? get error => _error;
  int get total => _total;
  int get page => _page;

  int get initialCount => _entries.where((e) => e.isInitial).length;
  int get uploadedCount => _entries.where((e) => e.isUploaded).length;
  int get learnedCount => _entries.where((e) => e.isLearned).length;

  Future<void> fetchEntries({String? source, bool refresh = false}) async {
    if (refresh) {
      _page = 1;
      _entries = [];
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final queryParams = <String, dynamic>{
        'page': _page,
        'limit': 50,
      };
      if (source != null) {
        queryParams['source'] = source;
      }

      final response = await _apiService.get(
        ApiConstants.knowledge,
        queryParams: queryParams,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['entries'];
        final newEntries = data.map((json) => KnowledgeEntry.fromJson(json)).toList();

        if (refresh) {
          _entries = newEntries;
        } else {
          _entries.addAll(newEntries);
        }

        _total = response.data['total'];

        // Update stats
        if (response.data['stats'] != null) {
          for (var stat in response.data['stats']) {
            _stats[stat['source']] = stat['count'];
          }
        }
      }
    } catch (e) {
      _error = 'فشل تحميل قاعدة المعرفة';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> search(String query) async {
    if (query.length < 2) {
      _searchResults = [];
      notifyListeners();
      return;
    }

    _isSearching = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.get(
        ApiConstants.knowledgeSearch,
        queryParams: {'q': query, 'limit': 10},
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['results'];
        _searchResults = data.map((json) => KnowledgeEntry.fromJson(json)).toList();
      }
    } catch (e) {
      _error = 'فشل البحث';
    }

    _isSearching = false;
    notifyListeners();
  }

  Future<bool> addEntry(String clientMessage, String doctorResponse, {String? category}) async {
    try {
      final response = await _apiService.post(
        ApiConstants.knowledge,
        data: {
          'client_message': clientMessage,
          'doctor_response': doctorResponse,
          'category': category ?? 'uploaded',
        },
      );

      if (response.statusCode == 201) {
        final newEntry = KnowledgeEntry.fromJson(response.data['entry']);
        _entries.insert(0, newEntry);
        _total++;
        notifyListeners();
        return true;
      }
    } catch (e) {
      _error = 'فشل الإضافة';
      notifyListeners();
    }
    return false;
  }

  Future<bool> bulkUpload(List<Map<String, String>> entries) async {
    try {
      final response = await _apiService.post(
        ApiConstants.knowledgeBulk,
        data: {'entries': entries},
      );

      if (response.statusCode == 201) {
        // Refresh the list
        await fetchEntries(refresh: true);
        return true;
      }
    } catch (e) {
      _error = 'فشل الرفع الجماعي';
      notifyListeners();
    }
    return false;
  }

  Future<bool> deleteEntry(int id) async {
    try {
      final response = await _apiService.delete(ApiConstants.knowledgeById(id));

      if (response.statusCode == 200) {
        _entries.removeWhere((e) => e.id == id);
        _total--;
        notifyListeners();
        return true;
      }
    } catch (e) {
      _error = 'فشل الحذف';
      notifyListeners();
    }
    return false;
  }

  void clearSearch() {
    _searchResults = [];
    notifyListeners();
  }

  void loadMore() {
    _page++;
    fetchEntries();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
