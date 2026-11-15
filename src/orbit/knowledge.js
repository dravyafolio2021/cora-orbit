// What Orbit "knows" about the video. In this demo it is written by hand from
// the film's official subtitles and chapters, so no AI service is called.
// A production version would generate it from the transcript (for example
// with Mux's AI workflows) and ship it alongside the video.

export const KNOWLEDGE = {
  title: 'Tears of Steel',
  credit: 'Blender Foundation, CC BY 3.0',

  // A short summary, each point linked to a moment in the film.
  summary: [
    { t: 22, text: 'On a bridge, Celia breaks up with Thom: he wants to be “awesome in space” and admits her robot hand freaks him out.' },
    { t: 43, text: 'Forty years later a giant robot threatens the world, and a team syncs and locks onto the robot’s memory.' },
    { t: 185, text: 'The crew restages the old breakup like a film shoot, hoping a better ending will overwrite that memory.' },
    { t: 369, text: 'The first take goes wrong, the robot strikes back, and it’s Celia: “You broke my heart.”' },
    { t: 518, text: 'Thom finally says it: “The world’s changed, Celia… maybe we can too.” The overwrite completes.' },
  ],

  // One line per chapter, keyed by the chapter title in chapters.vtt.
  chapterNotes: {
    Opening: 'The titles, before the story starts.',
    'The breakup': 'Young Thom and Celia on the bridge. “You’re a jerk, Thom.”',
    'Forty years later': 'The future: the team syncs and locks onto the giant robot’s memory.',
    'Second thoughts': 'A quiet moment before the plan: “It’s not my fault, you know.”',
    'Places, everyone': 'The crew gets ready to restage the breakup, about ten minutes before the robots arrive.',
    'Take one': '“…and, action!” The memory overwrite starts as Thom replays the bridge scene.',
    'You broke my heart': 'The take is aborted and the robot reveals itself as Celia.',
    'Out of time': 'The robots close in and the crew runs out of time.',
    'The world’s changed': 'Thom’s real apology, and the overwrite reaches 100%.',
    'A lesson learned': 'The aftermath. “Could’a gone worse.”',
    Credits: 'The end credits.',
  },

  // People and things Orbit can answer "who / what is …" about.
  entities: [
    { name: 'Thom', aka: ['tom'], t: 22, about: 'Thom wanted to be “awesome in space” and left Celia on the bridge. Forty years later he has to replay that moment and get it right.' },
    { name: 'Celia', aka: ['celia', 'robot'], t: 369, about: 'Celia works in robotics and has a robot hand. Forty years on, her hurt drives the giant robot: “You broke my heart.”' },
    { name: 'Barley', aka: [], t: 197, about: 'Barley is part of the crew running the memory overwrite: “How’s it looking, Barley?”' },
    { name: 'Captain', aka: ['the captain'], t: 506, about: 'The Captain leads the team. Near the end someone shouts “Captain! We have to abort!”' },
  ],
};
