# `skills-lock.json` quick reference

`skills-lock.json` is a manifest of the skills this repository expects and the
source/version identity used to obtain them. It is not the skill content.

```json
{
  "version": 1,
  "skills": {
    "grill-me": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/productivity/grill-me/SKILL.md",
      "computedHash": "..."
    }
  }
}
```

| Field | Meaning |
|---|---|
| `version` | Version of the lock-file format. |
| `skills` | Map keyed by skill name. |
| `source` | Upstream owner/repository. Here, `mattpocock/skills`. |
| `sourceType` | Source kind. Here, GitHub. |
| `skillPath` | Path to that skill's `SKILL.md` inside the source repository. |
| `computedHash` | Content fingerprint used to detect a changed skill. |

In this repo, the installed files live under `.agents/skills/`. The lock file
describes their provenance and integrity; the symlinks expose that directory
to Claude, Codex, and Cursor.

The important distinction is:

```text
skills-lock.json        what should be installed and from where
.agents/skills/<source>  the installed skill files
tool/skills              directory-level access to those files
```

If the lock file says `grill-me` exists but its `SKILL.md` is missing, the
installation is incomplete. If the file exists but its content no longer
matches `computedHash`, it may have drifted from the locked source.
