## ADDED Requirements

### Requirement: System downloads episode audio files

The system SHALL download the audio file from the episode's enclosure URL and store it locally for processing.

#### Scenario: Successful audio download

- **WHEN** an episode is queued for processing
- **THEN** the system SHALL download the audio file from the enclosure URL and store the original Content-Length for change detection

#### Scenario: Download failure

- **WHEN** the audio download fails (network error, 404, etc.)
- **THEN** the system SHALL mark the episode as "failed" and the job SHALL be retried according to queue retry policy

### Requirement: System preprocesses audio with ffmpeg

The system SHALL convert downloaded audio to mono, 16kHz sample rate, opus codec at 32kbps to reduce file size before transcription.

#### Scenario: Preprocessing reduces file size

- **WHEN** an audio file is downloaded
- **THEN** the system SHALL run ffmpeg to produce a mono, 16kHz, opus 32kbps output file

#### Scenario: ffmpeg is not available

- **WHEN** ffmpeg is not installed or not found in PATH
- **THEN** the system SHALL fail the job with a clear error message indicating ffmpeg is required

### Requirement: System uploads all preprocessed audio to object storage

The system SHALL always upload preprocessed audio files to object storage (R2/S3) and store the storage key for the transcription step.

#### Scenario: Preprocessed audio upload

- **WHEN** the audio preprocessing step completes
- **THEN** the system SHALL upload the preprocessed file to object storage and store the storage key in the episode's audio_storage_key field

### Requirement: System detects episode content changes

The system SHALL detect when a previously processed episode's audio content has changed by comparing the enclosure URL and Content-Length.

#### Scenario: Enclosure URL changed

- **WHEN** a feed poll detects that an existing episode's enclosure URL has changed
- **THEN** the system SHALL re-enqueue the episode for full reprocessing

#### Scenario: Same URL and Content-Length

- **WHEN** a feed poll detects that the enclosure URL and Content-Length are unchanged
- **THEN** the system SHALL not re-process the episode
