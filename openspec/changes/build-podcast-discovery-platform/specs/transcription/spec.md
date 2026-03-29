## ADDED Requirements

### Requirement: System transcribes audio using Groq Whisper API
The system SHALL send preprocessed audio to the Groq Whisper API and store the resulting transcript text.

#### Scenario: Transcription via object storage URL
- **WHEN** a preprocessed audio file has been uploaded to object storage
- **THEN** the system SHALL pass the object storage URL to Groq Whisper API and store the returned transcript as raw_text

#### Scenario: Transcription API failure
- **WHEN** the Groq Whisper API returns an error
- **THEN** the system SHALL mark the job as failed and it SHALL be retried according to queue retry policy

### Requirement: System stores transcripts with episode association
The system SHALL store each transcript in the transcripts table linked to its episode, with both the raw transcript and a clean version (after ad stripping in the analysis step).

#### Scenario: Transcript storage
- **WHEN** transcription completes successfully
- **THEN** the system SHALL create a transcript record with the episode_id and raw_text populated, and clean_text set to null (populated later by content analysis)
