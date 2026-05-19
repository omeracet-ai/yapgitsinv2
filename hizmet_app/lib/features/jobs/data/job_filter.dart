import 'package:flutter_riverpod/flutter_riverpod.dart';

enum JobSort { newest, budgetHigh, budgetLow }

class JobFilter {
  final double? budgetMin;
  final double? budgetMax;
  final JobSort sort;
  final bool featuredOnly;

  const JobFilter({
    this.budgetMin,
    this.budgetMax,
    this.sort = JobSort.newest,
    this.featuredOnly = false,
  });

  bool get isEmpty =>
      budgetMin == null &&
      budgetMax == null &&
      !featuredOnly &&
      sort == JobSort.newest;

  int get activeCount {
    var c = 0;
    if (budgetMin != null || budgetMax != null) c++;
    if (featuredOnly) c++;
    if (sort != JobSort.newest) c++;
    return c;
  }

  JobFilter copyWith({
    double? budgetMin,
    double? budgetMax,
    JobSort? sort,
    bool? featuredOnly,
    bool clearBudgetMin = false,
    bool clearBudgetMax = false,
  }) {
    return JobFilter(
      budgetMin: clearBudgetMin ? null : (budgetMin ?? this.budgetMin),
      budgetMax: clearBudgetMax ? null : (budgetMax ?? this.budgetMax),
      sort: sort ?? this.sort,
      featuredOnly: featuredOnly ?? this.featuredOnly,
    );
  }
}

final jobFilterProvider =
    StateProvider<JobFilter>((ref) => const JobFilter());
