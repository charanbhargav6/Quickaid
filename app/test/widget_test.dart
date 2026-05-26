import 'package:flutter_test/flutter_test.dart';
import 'package:app/main.dart';

void main() {
  testWidgets('QuickAid app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const QuickAidApp());
    expect(find.text('QuickAid'), findsOneWidget);
  });
}
