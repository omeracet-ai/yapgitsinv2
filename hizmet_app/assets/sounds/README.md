# In-App Notification Sounds — Phase 253

`SoundPlayer` (`lib/core/services/sound_player.dart`) plays one of four short
clips based on the `soundTag` data field that the backend attaches to every
push notification (see `NotificationsService.soundTagFor()`).

| File          | soundTag  | Triggers                                       |
| ------------- | --------- | ---------------------------------------------- |
| `offer.mp3`   | `offer`   | NEW_OFFER, COUNTER_OFFER                       |
| `accept.mp3`  | `accept`  | OFFER_ACCEPTED, BOOKING_CONFIRMED              |
| `release.mp3` | `release` | JOB_COMPLETED, BOOKING_COMPLETED (escrow paid) |
| `alert.mp3`   | `alert`   | SYSTEM, withdrawal status, disputes, fallback  |

## Replace the placeholders

The `.mp3` files currently in this folder are zero-content stubs. Replace each
with a real ≤1 s sound design clip before shipping. Suggested character:

- **offer.mp3** — bright two-note "ping" (a customer just got a quote)
- **accept.mp3** — affirmative chime (deal closed)
- **release.mp3** — coin / cash register (worker just got paid)
- **alert.mp3** — neutral notification bell (default)

Keep each file under 50 KB to avoid bloating the APK. Mono 44.1 kHz @ 96 kbps
is plenty for short UI cues.
