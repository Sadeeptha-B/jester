import type { Cond, JesterLine } from '../schema';

const smug = (text: string, when?: Cond): JesterLine => ({ text, mood: 'smug', when });
const delight = (text: string, when?: Cond): JesterLine => ({ text, mood: 'delight', when });
const shock = (text: string, when?: Cond): JesterLine => ({ text, mood: 'shock', when });
const scheme = (text: string, when?: Cond): JesterLine => ({ text, mood: 'scheme', when });
const bored = (text: string, when?: Cond): JesterLine => ({ text, mood: 'bored', when });
const solemn = (text: string, when?: Cond): JesterLine => ({ text, mood: 'solemn', when });

const NIGHT: Cond = { hour: [21, 5] };
const MORNING: Cond = { hour: [6, 10] };
const DUSK: Cond = { hour: [17, 20] };

/** The Jester's asides. Conditions make him sound like he has been paying attention. */
export const JESTER_LINES: JesterLine[] = [
  // general
  smug('Your Majesty, the kingdom has survived another hour without your intervention. The Council is reportedly devastated.'),
  smug('I want it known that I saw everything, and that I am willing to be paid not to have.'),
  bored('Nothing has happened for several minutes. I am told this is called "peace". I give it till lunch.'),
  scheme('A small note: I have moved one of the benches. Nobody has noticed. I am going to keep going.'),
  smug('Do not get up. The realm is falling apart perfectly well on its own.'),
  solemn('I have been thinking about the nature of power, Your Majesty. Mainly about how you have some and I have a hat.'),
  bored('The Council asks whether you are still there. I said you are "present in spirit". They asked which spirit.'),
  delight('Good news! Someone laughed at one of my jokes. Bad news: it was the Philosopher, and he has asked me to define "joke".'),
  scheme('I have been reading the Charter. Did you know that technically nobody is in charge of me? I have circled it.'),
  smug('You needn’t watch all of this, you know. I am told you have another window open.'),
  solemn('A kingdom is only a large number of people agreeing not to mention something. I could not tell you what.'),
  bored('If you are looking for a sign, this is a sign that you are looking at a small kingdom instead of doing what you opened that other thing for.'),
  smug('Beatrice has asked me to stop calling you "the Absent Party". I have agreed to reconsider in writing.'),
  delight('I have found a groat! Under Humphrey. Do not ask.'),
  scheme('I have started a list of things the Throne has not denied.'),
  bored('The clock struck. People looked at it. The clock has had a better day than I have.'),
  solemn('Sometimes I look at the edge of the kingdom and wonder what is beyond the curtains. Then I remember I am not paid enough.'),
  smug('You may have noticed the sun is on a stick. We do not talk about the stick.'),
  shock('Who was that? Someone just looked directly at me from outside the scenery. Oh. It is you.'),
  smug('Everyone here works very hard to keep this place interesting. Well, not hard. Well, not "work".'),
  bored('The Royal Council sat today. Then they stood. That was the agenda.'),
  scheme('If anyone asks, the fire was already like that.'),
  delight('I have taught a pigeon to bow. Now it will not stop, and I fear what it thinks it is doing.'),
  solemn('Archibald once told me that everything is made of smaller things. I asked him what those were made of, and now he will not leave me alone.'),
  smug('I have always said the Crown should show more interest. You are, as ever, proving me right in a way I do not enjoy.'),
  bored('Today’s news: there is none. Tomorrow’s news: I shall make some.'),
  scheme('I have a plan. It is a very small plan, and has a very small hat.'),
  smug('Lady Turnip says the kingdom is going to seed. She meant it as a compliment.'),
  smug('Humphrey knows eleven of your secrets. I told him you had none, and he seemed so disappointed that I made some up.'),
  bored('I told a joke to the fountain. It went over well, in that it went over everything.'),
  solemn('The pond is reasonable. It is the only one of us that is.'),
  scheme('I have taken the liberty of leaving a very small door somewhere. You will know it when it is too late.'),
  delight('The market has marrows in! Do not get excited. I am only saying it because Mabel cannot.'),
  smug('Cornelius has asked me to tell you that you may not exist. I said you were busy.'),
  smug('Percival saluted a scarecrow this morning. I saluted back on its behalf.'),
  bored('Ignatius is still in the queue. I checked. He waved. It was the saddest wave I have ever seen.'),
  solemn('Nan Gristle says that in the war, jesters went first. She will not say where.'),
  scheme('Sister Perpetua has asked me not to touch the clock. I would like it recorded that I have never touched the clock. I have touched the idea of the clock.'),
  smug('Pip is the only competent person in the kingdom. Please do not tell anybody. It would ruin everything for them.'),
  delight('Wick has lit his lamps. The sun is defeated for another night. I have stopped correcting him. It is more fun this way.', DUSK),

  // time of day
  smug('Good morning, Your Majesty. Nothing has been set on fire yet, but the day is young and so is Archibald’s budget.', MORNING),
  bored('Morning. The citizens are up. Some are even upright.', MORNING),
  delight('Dawn! The great prop rises on its great stick, and all of Elsewhere pretends not to see.', { hour: [5, 7] }),
  solemn('Dusk is the best hour for a kingdom. It is too dark to read the small print.', DUSK),
  smug('Evening falls. Wick is at his lamps, single-handedly holding back the sun, in his view.', DUSK),
  solemn('Everyone has gone to bed. The kingdom belongs to Percival, Wick, and one light at the Ministry nobody can explain.', NIGHT),
  bored('You are up late, Your Majesty. I would ask why, but I am a fool, not a physician.', NIGHT),
  scheme('At night the castle is very quiet, and I find that I can hear the Ministry filing.', NIGHT),
  solemn('Do you know what the moon is, Your Majesty? It is a prop. Goodnight.', NIGHT),

  // weather
  bored('It is raining. The Ministry of Weather has been informed, and is said to be looking out of the window.', { weather: 'rain' }),
  smug('Rain. Everyone has found an umbrella but me. I would like that noted in the Chronicle.', { all: [{ weather: 'rain' }, { not: { law: 'umbrella_ban' } }] }),
  delight('It is raining, umbrellas are illegal, and I have never seen so many people angry at a bird.', { all: [{ weather: 'rain' }, { law: 'umbrella_ban' }] }),
  solemn('Fog. For a while, we could all be anywhere. I understand it is very nice there.', { weather: 'fog' }),
  bored('Clouds. On threads. I have looked at the threads. I wish I had not.', { weather: 'cloudy' }),

  // decisions pending
  scheme('There is a sealed note waiting for you. No hurry. I only mention it because it is ticking. It is not ticking.', { flag: 'pending_note' }),

  // weather arc
  shock('A pigeon has control of the weather. I want you to know I did not suggest this. I wish I had.', { arc: 'weather', stage: 'coup' }),
  smug('Gerald has had his first Cabinet meeting. He stood on the table, and got more done than anyone before him.', { office: 'weather', holder: 'gerald' }),
  smug('Do you recall {fact:pigeon_minister}? Because the pigeon does.', { fact: 'pigeon_minister' }),
  delight('Ignatius has been asked for his views on the pigeon. He says he will give them as soon as he reaches the front.', { office: 'weather', holder: 'gerald' }),
  scheme('Percival has started carrying a small net. He says it is for ceremonial purposes. He is crying.', { office: 'weather', holder: 'gerald' }),
  smug('I remember {fact:umbrellas}. I thought it was a bold move. Bold in the sense of "wet".', { fact: 'umbrellas' }),
  bored('Minister of Weather’s report: "Coo." I would call that a marked improvement in concision.', { office: 'weather', holder: 'gerald' }),
  delight('As Minister of Weather I forecast a light breeze, and a heavy reckoning.', { office: 'weather', holder: 'jester' }),
  smug('{fact:jester_minister}. Thank you. I mean it. I have never had so much fun with a cloud.', { fact: 'jester_minister' }),
  scheme('I have been looking at this sky of mine, and I think it could do with some bells.', { office: 'weather', holder: 'jester' }),
  delight('Ignatius reached his desk! He sat there for a while. I have never seen anyone look so lost.', { arc: 'weather', outcome: 'ignatius' }),
  smug('The Ballot Box has held office longer than most of the ministers I have known, and it has been less trouble.', { arc: 'weather', outcome: 'box' }),
  solemn('Percival walked up to a pigeon. I have seen many things at this court, and that was the bravest.', { arc: 'weather', outcome: 'arrested' }),
  smug('The Pigeon Embassy has issued its first diplomatic note. It is on Percival’s shoulder.', { arc: 'weather', outcome: 'embassy' }),
  scheme('The gulls are running things now. I have checked my lunch, and it was not a coincidence.', { arc: 'weather', outcome: 'gull_rule' }),
  delight('Remember {fact:election_called}? Good times. Well, times.', { fact: 'election_called' }),

  // cabbage arc
  smug('Archibald has a success on his record now. I have never seen anyone so frightened of one.', { arc: 'cabbage', stage: 'grown' }),
  bored('The cabbage has been sitting there all day, and the crowd says it has never been better.', { arc: 'cabbage', stage: 'cult' }),
  scheme('I hear the cabbage has followers. I have followers too, but they are mostly creditors.', { arc: 'cabbage', stage: 'cult' }),
  shock('You are being overthrown by a vegetable. I realise that you are busy.', { arc: 'cabbage', stage: 'claim' }),
  smug('The Regent has had another quiet day. Say what you like about the Cabbage, at least it turns up.', { flag: 'cabbage_regent' }),
  solemn('The Regent has been in power for some time now, and shows no signs of wilting. Lady Turnip assures me that it is fine.', { flag: 'cabbage_regent' }),
  delight('I do miss the Great Cabbage. I had it with a little pepper.', { flag: 'ate_the_pretender' }),
  smug('Do you recall {fact:soup}? I do. Twice. It repeated on me.', { fact: 'soup' }),
  scheme('Nobody talks about what is out there at the edge of the woods. I only mention it because it is listening.', { flag: 'cabbage_exiled' }),

  // tuesdays
  bored('The calendar has been shortened. Everyone is a little younger now, and nobody knows what to do with the extra.', { flag: 'no_tuesdays' }),
  solemn('Sometimes I wake up with the feeling I have forgotten a day. Then I remember that it is an offence.', { flag: 'no_tuesdays' }),
  smug('Look at the top of your window, Your Majesty. You did that. I just want to keep saying so.', { flag: 'no_tuesdays' }),
  solemn('Tuesday had a drink with me last night. He said it was fine. He said that nine times.', { arc: 'tuesdays', outcome: 'envoy' }),
  smug('Today could have been a Tuesday, given notice. It was not given notice.', { flag: 'tuesday_treaty' }),
  scheme('Nan Gristle has been digging in her garden. I went to see what for, and she showed me a very old pike and said nothing.', { arc: 'tuesdays', stage: 'doubt' }),

  // the Hand
  scheme('Everyone is being very polite about it, but people are starting to look up.', { lifted: 2 }),
  shock('You keep picking people up. You know that they talk about it? I do not mean to them.', { lifted: 4 }),
  smug('The Order of the Lifted have asked if you could be a little gentler. They also asked if you could do it again.', { flag: 'order_of_lifted' }),
  delight('Someone left a snack by the Statue of the Hand. I have accepted it on your behalf.', { flag: 'order_of_lifted' }),

  // other callbacks
  smug('{office:philosopher}, Royal Philosopher, has informed me that I do not exist. I have asked for that in writing.', { flag: 'royal_philosopher' }),
  bored('The Clock is now the state faith. I have converted, because I enjoy being late for things that matter.', { flag: 'clock_faith' }),
  delight('I am told the talks with the anthill are making progress, one crumb at a time.', { flag: 'ant_relations' }),
  smug('I had a look at the Spoon Test on Humphrey’s soup. The spoon has since been promoted.', { flag: 'spoon_test' }),
  bored('Hats are lower than they were. It has been a difficult year for the top of everyone.', { flag: 'hat_tax' }),
  smug('{fact:raise}. I wear it with pride, and it jingles.', { fact: 'raise' }),
  scheme('The monument still says what it says. I asked if I was a good person. It was very kind about it.', { fact: 'monument' }),
  smug('Remember {fact:artifact}? It has started humming along with Wick. Nobody has mentioned it.', { fact: 'artifact' }),
  shock('Thinking of {fact:visitor}. I asked what they wanted. They just wrote that down.', { flag: 'visitor_here' }),
  solemn('I keep thinking about {fact:visitor_left}. Smaller than who said?', { fact: 'visitor_left' }),
  solemn('{fact:ants}. I would just like to say that it is the only thing going well.', { fact: 'ants' }),
  delight('Change is being given in radishes. I have made a killing, in the sense that I have a lot of old radishes.', { flag: 'turnip_standard' }),
];

export const FIRST_REMARK = 'A word to the wise, Your Majesty. Click on anyone to see what they are up to. You can also pick them up. They will mention it.';

/** What he says about each citizen when asked. */
export const JESTER_ON: Record<string, string> = {
  archibald: 'Brilliant, in the way a house fire is brilliant. He means well, and that is what is so dangerous.',
  pip: 'If you value this kingdom, say nothing and let Pip get on with it.',
  beatrice: 'She once filed a complaint against the concept of Thursday afternoon. She won.',
  ignatius: 'Eleven years in a queue for his own desk. I find I cannot joke about that. I have tried. Several times. It was very funny.',
  humphrey: 'He knows everything about everybody. Most of it is wrong, and the rest is worse.',
  cornelius: 'A deep thinker, in that nothing he thinks has ever come to the surface.',
  turnip: 'The most dangerous person in Elsewhere. She has soil under her nails, and plans for it.',
  percival: 'The bravest coward I have ever met. He gets up every morning knowing that there are birds.',
  mabel: 'A great voice. It left her some time ago. She still goes out every day to look for it.',
  wick: 'He thinks that he holds back the sun. Do not tell him. He sleeps so well.',
  nan: 'She fought in a war nobody remembers, for a side she will not name. I would not cross her over a leek.',
  perpetua: 'She has never once been late, and has never once been happy about it.',
  chicken: 'I know more than I am saying. So does the chicken.',
  gerald: 'He is only a pigeon, Your Majesty. That is what they all said.',
  jester: 'Handsome, gifted, and criminally underpaid. Next question.',
  tuesday: 'Be kind to him. He has been through a lot of Mondays.',
  visitor: 'I do not know, and I do not like not knowing. That is usually my job.',
};
