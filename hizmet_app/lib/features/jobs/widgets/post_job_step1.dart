import 'package:flutter/material.dart';

/// Step 1 of the post-job wizard: category selection + due date.
///
/// This is a thin presentational shell — the parent [PostJobScreen] owns
/// all state (controllers, providers, draft autosave) and supplies the
/// already-built body for this step via [body]. Splitting into a widget
/// keeps the parent build() readable and lets each step evolve independently.
class PostJobStep1 extends StatelessWidget {
  final Widget body;
  const PostJobStep1({super.key, required this.body});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      child: body,
    );
  }
}
