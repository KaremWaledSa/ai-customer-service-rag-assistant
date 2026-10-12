import '../../core/constants/api_constants.dart';
import '../models/stats.dart';
import 'api_service.dart';

class StatsService {
  final ApiService _apiService;

  StatsService(this._apiService);

  Future<OverviewStats> getOverview() async {
    final response = await _apiService.get(ApiConstants.statsOverview);
    if (response.statusCode == 200) {
      return OverviewStats.fromJson(response.data);
    }
    throw Exception('Failed to get overview stats');
  }

  Future<BudgetStatus> getBudget() async {
    final response = await _apiService.get(ApiConstants.statsBudget);
    if (response.statusCode == 200) {
      return BudgetStatus.fromJson(response.data);
    }
    throw Exception('Failed to get budget status');
  }

  Future<List<DailyUsage>> getUsage({int days = 30}) async {
    final response = await _apiService.get(
      ApiConstants.statsUsage,
      queryParams: {'days': days},
    );
    if (response.statusCode == 200) {
      final List<dynamic> data = response.data['daily'];
      return data.map((json) => DailyUsage.fromJson(json)).toList();
    }
    throw Exception('Failed to get usage stats');
  }
}
