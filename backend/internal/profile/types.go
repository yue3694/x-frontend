package profile

import "github.com/example/neural-synthesis/backend/internal/auth"

type Metric struct {
	Label string `json:"label"`
	Value string `json:"value"`
	Color string `json:"color"`
}

type SkillItem struct {
	Name     string   `json:"name"`
	SyncRate int      `json:"syncRate"`
	Tags     []string `json:"tags"`
}

type SkillCategory struct {
	Category    string      `json:"category"`
	Icon        string      `json:"icon"`
	Color       string      `json:"color"`
	Items       []SkillItem `json:"items"`
	MasteryNote string      `json:"masteryNote"`
}

type Project struct {
	Title       string   `json:"title"`
	Version     string   `json:"version"`
	Icon        string   `json:"icon"`
	Summary     string   `json:"summary"`
	Logic       string   `json:"logic"`
	Tech        []string `json:"tech"`
	Highlight   string   `json:"highlight"`
	Achievement string   `json:"achievement"`
}

type TimelineEntry struct {
	DateRange string   `json:"dateRange"`
	Role      string   `json:"role"`
	Tags      []string `json:"tags,omitempty"`
	Bullets   []string `json:"bullets"`
	Marker    string   `json:"marker"`
}

type Profile struct {
	Headline     string           `json:"headline"`
	Subheadline  string           `json:"subheadline"`
	Quote        string           `json:"quote"`
	Email        string           `json:"email"`
	Location     string           `json:"location"`
	Availability string           `json:"availability"`
	AvatarURL    string           `json:"avatarUrl"`
	Metrics      []Metric         `json:"metrics"`
	Skills       []SkillCategory  `json:"skills"`
	Projects     []Project        `json:"projects"`
	Timeline     []TimelineEntry  `json:"timeline"`
}

type Response struct {
	User    auth.User `json:"user"`
	Profile Profile   `json:"profile"`
}