import 'package:flutter/material.dart';

/// Step 2 of the post-job wizard: title, description, budget.
///
/// Presentational shell — parent owns state. See [PostJobStep1] for rationale.
class PostJobStep2 extends StatelessWidget {
  final Widget body;
  const PostJobStep2({super.key, required this.body});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      child: body,
    );
  }
}
