export const ARMS_EXERCISES = [
  {
    slug: "barbell-curl",
    name: "Barbell Curl",
    description: "Barbell curl for biceps strength.",
    category: "strength",
    muscle_group: "biceps",
    muscles: [
      "forearms"
    ],
    equipment: [
      "barbell"
    ],
    difficulty: "beginner",
    tags: [
      "isolation",
      "pull",
      "upper-body"
    ],
    instructions: [
      "Stand tall holding the bar with palms up.",
      "Keep elbows close to the sides.",
      "Curl the bar toward the shoulders.",
      "Lower under control."
    ],
    image_url: "/images/exercises/ink/barbell-curl.svg",
    default_sets: 3,
    default_reps: "10-15",
    default_rest: 60,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "dumbbell-curl",
    name: "Dumbbell Curl",
    description: "Basic dumbbell curl for biceps.",
    category: "strength",
    muscle_group: "biceps",
    muscles: [
      "forearms"
    ],
    equipment: [
      "dumbbells"
    ],
    difficulty: "beginner",
    tags: [
      "isolation",
      "pull",
      "upper-body"
    ],
    instructions: [
      "Hold dumbbells by the sides.",
      "Curl one or both dumbbells upward.",
      "Keep the upper arms mostly still.",
      "Lower slowly to full extension."
    ],
    image_url: "/images/exercises/ink/dumbbell-curl.svg",
    default_sets: 3,
    default_reps: "10-15",
    default_rest: 60,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "hammer-curl",
    name: "Hammer Curl",
    description: "Neutral-grip curl for biceps and forearms.",
    category: "strength",
    muscle_group: "biceps",
    muscles: [
      "forearms"
    ],
    equipment: [
      "dumbbells"
    ],
    difficulty: "beginner",
    tags: [
      "isolation",
      "pull",
      "upper-body"
    ],
    instructions: [
      "Hold dumbbells with palms facing inward.",
      "Curl the weights without rotating the wrists.",
      "Squeeze at the top.",
      "Lower under control."
    ],
    image_url: "/images/exercises/ink/hammer-curl.svg",
    default_sets: 3,
    default_reps: "10-15",
    default_rest: 60,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "incline-dumbbell-curl",
    name: "Incline Dumbbell Curl",
    description: "Incline curl that lengthens the biceps.",
    category: "strength",
    muscle_group: "biceps",
    muscles: [
      "forearms"
    ],
    equipment: [
      "dumbbells",
      "bench"
    ],
    difficulty: "beginner",
    tags: [
      "isolation",
      "pull",
      "upper-body"
    ],
    instructions: [
      "Set a bench to a low incline.",
      "Let dumbbells hang with arms extended.",
      "Curl while keeping shoulders back.",
      "Lower slowly to the stretched position."
    ],
    image_url: "/images/exercises/ink/incline-dumbbell-curl.svg",
    default_sets: 3,
    default_reps: "10-15",
    default_rest: 60,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "cable-curl",
    name: "Cable Curl",
    description: "Cable curl with steady tension.",
    category: "strength",
    muscle_group: "biceps",
    muscles: [
      "forearms"
    ],
    equipment: [
      "cable-machine"
    ],
    difficulty: "beginner",
    tags: [
      "isolation",
      "pull",
      "upper-body"
    ],
    instructions: [
      "Attach a handle to a low cable.",
      "Stand tall with elbows near the ribs.",
      "Curl the handle toward the chest.",
      "Return slowly to full extension."
    ],
    image_url: "/images/exercises/ink/cable-curl.svg",
    default_sets: 3,
    default_reps: "10-15",
    default_rest: 60,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "preacher-curl",
    name: "Preacher Curl",
    description: "Supported curl emphasizing strict form.",
    category: "strength",
    muscle_group: "biceps",
    muscles: [
      "forearms"
    ],
    equipment: [
      "machine"
    ],
    difficulty: "beginner",
    tags: [
      "isolation",
      "pull",
      "upper-body"
    ],
    instructions: [
      "Set upper arms on the preacher pad.",
      "Start with elbows extended but not locked.",
      "Curl the handle or bar upward.",
      "Lower slowly to the start."
    ],
    image_url: "/images/exercises/ink/preacher-curl.svg",
    default_sets: 3,
    default_reps: "10-15",
    default_rest: 60,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "triceps-pushdown",
    name: "Triceps Pushdown",
    description: "Cable isolation for triceps.",
    category: "strength",
    muscle_group: "triceps",
    muscles: [],
    equipment: [
      "cable-machine"
    ],
    difficulty: "beginner",
    tags: [
      "isolation",
      "push",
      "upper-body"
    ],
    instructions: [
      "Stand facing a high cable.",
      "Keep elbows pinned near the ribs.",
      "Push the handle down until arms extend.",
      "Return slowly without moving the upper arms."
    ],
    image_url: "/images/exercises/ink/triceps-pushdown.svg",
    default_sets: 3,
    default_reps: "10-15",
    default_rest: 60,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "overhead-triceps-extension",
    name: "Overhead Triceps Extension",
    description: "Overhead extension for long-head triceps.",
    category: "strength",
    muscle_group: "triceps",
    muscles: [],
    equipment: [
      "dumbbells"
    ],
    difficulty: "beginner",
    tags: [
      "isolation",
      "push",
      "upper-body"
    ],
    instructions: [
      "Hold one dumbbell overhead with both hands.",
      "Keep elbows pointed forward.",
      "Lower the weight behind the head.",
      "Extend the arms back overhead."
    ],
    image_url: "/images/exercises/ink/overhead-triceps-extension.svg",
    default_sets: 3,
    default_reps: "10-15",
    default_rest: 60,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "skull-crusher",
    name: "Skull Crusher",
    description: "Lying triceps extension using barbell or dumbbells.",
    category: "strength",
    muscle_group: "triceps",
    muscles: [],
    equipment: [
      "barbell",
      "bench"
    ],
    difficulty: "beginner",
    tags: [
      "isolation",
      "push",
      "upper-body"
    ],
    instructions: [
      "Lie on a bench with the weight above the chest.",
      "Keep upper arms angled slightly back.",
      "Bend elbows to lower the weight toward the head.",
      "Extend the elbows to return."
    ],
    image_url: "/images/exercises/ink/skull-crusher.svg",
    default_sets: 3,
    default_reps: "10-15",
    default_rest: 60,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "close-grip-bench-press",
    name: "Close Grip Bench Press",
    description: "Bench press variation emphasizing triceps.",
    category: "strength",
    muscle_group: "triceps",
    muscles: [
      "chest",
      "anterior-deltoid"
    ],
    equipment: [
      "barbell",
      "bench"
    ],
    difficulty: "intermediate",
    tags: [
      "compound",
      "push",
      "upper-body"
    ],
    instructions: [
      "Lie on a bench and grip the bar around shoulder width.",
      "Lower the bar toward the lower chest.",
      "Keep elbows closer to the body.",
      "Press up until arms extend."
    ],
    image_url: "/images/exercises/ink/close-grip-bench-press.svg",
    default_sets: 3,
    default_reps: "6-10",
    default_rest: 120,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "bench-dip",
    name: "Bench Dip",
    description: "Bodyweight triceps dip using a bench.",
    category: "bodyweight",
    muscle_group: "triceps",
    muscles: [
      "chest",
      "shoulders"
    ],
    equipment: [
      "bench",
      "bodyweight"
    ],
    difficulty: "beginner",
    tags: [
      "bodyweight",
      "push",
      "upper-body"
    ],
    instructions: [
      "Place hands on a bench behind the hips.",
      "Walk feet forward and keep chest lifted.",
      "Bend elbows to lower the body.",
      "Press through the hands to return."
    ],
    image_url: "/images/exercises/ink/bench-dip.svg",
    default_sets: 3,
    default_reps: "8-15",
    default_rest: 75,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "wrist-curl",
    name: "Wrist Curl",
    description: "Forearm isolation for wrist flexors.",
    category: "strength",
    muscle_group: "forearms",
    muscles: [],
    equipment: [
      "dumbbells",
      "bench"
    ],
    difficulty: "beginner",
    tags: [
      "isolation",
      "upper-body"
    ],
    instructions: [
      "Sit with forearms supported on a bench or thighs.",
      "Hold dumbbells with palms up.",
      "Curl the wrists upward.",
      "Lower slowly through the full range."
    ],
    image_url: "/images/exercises/ink/wrist-curl.svg",
    default_sets: 3,
    default_reps: "10-15",
    default_rest: 60,
    source_type: "builtin",
    status: "active"
  }
]
