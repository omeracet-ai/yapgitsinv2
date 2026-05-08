import 'package:flutter/material.dart';

/// Step 3 of the post-job wizard: photos/videos + location + final review.
///
/// Presentational shell — parent owns state. See [PostJobStep1] for rationale.
class PostJobStep3 extends StatelessWidget {
  final Widget body;
  const PostJobStep3({super.key, required this.body});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      child: body,
    );
  }
}
