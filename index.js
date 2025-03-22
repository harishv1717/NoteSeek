const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(str => str.toLowerCase());

const player = new core.Player();
const model = new mm.OnsetsAndFrames(
    "https://storage.googleapis.com/magentadata/js/checkpoints/transcription/onsets_frames_uni"
);

document.getElementById("fileInput").addEventListener("change", e => {
    const sheet = document.getElementById("sheet");
    if (sheet != null) document.body.removeChild(sheet);

    console.log(new Blob([e.target.files[0]], { type: "audio/mp3" }));
    model.initialize().then(() => {
        model.transcribeFromAudioFile(new Blob([e.target.files[0]], { type: "audio/mp3" })).then(magentaSequence => {
            const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = Vex.Flow;
            let ticks = 0;

            magentaSequence.notes.sort((a, b) => a.startTime - b.startTime);
            console.log(magentaSequence.notes);
            const qLength = magentaSequence.notes[1].startTime;
            magentaSequence.notes.forEach((note, i) => {
                if (
                    Math.round(
                        ((i != magentaSequence.notes.length - 1
                            ? magentaSequence.notes[i + 1].startTime
                            : note.endTime) -
                            note.startTime) /
                            qLength
                    ) == 1
                ) {
                    ticks++;
                    note.duration = "q";
                    note.ticks = 1;
                } else if (
                    Math.round(
                        ((i != magentaSequence.notes.length - 1
                            ? magentaSequence.notes[i + 1].startTime
                            : note.endTime) -
                            note.startTime) /
                            qLength
                    ) == 2
                ) {
                    ticks += 2;
                    note.duration = "h";
                    note.ticks = 2;
                } else {
                    ticks += 4;
                    note.duration = "w";
                    note.ticks = 4;
                }
            });

            let div = document.createElement("div");
            div.setAttribute("id", "sheet");
            document.body.appendChild(div);

            const noteBars = [];
            let currentTicks = 0;
            let startIndex = 0;
            magentaSequence.notes.forEach((note, i) => {
                if (currentTicks == 0) startIndex = i;
                currentTicks += note.ticks;

                if (currentTicks == 4 || i == magentaSequence.notes.length - 1) {
                    noteBars.push(magentaSequence.notes.slice(startIndex, i + 1));
                    currentTicks = 0;
                }
            });

            console.log(noteBars);

            div = document.getElementById("sheet");
            const renderer = new Renderer(div, Renderer.Backends.SVG);

            renderer.resize(500, 500);
            const context = renderer.getContext();

            for (let i = 0; i < noteBars.length; i++) {
                const barNotes = noteBars[i];

                const staveNotes = barNotes.map(note => {
                    if (noteNames[note.pitch % 12].indexOf("#") >= 0)
                        return new StaveNote({
                            keys: [`${noteNames[note.pitch % 12]}/${Math.floor(note.pitch / 12) - 1}`],
                            duration: note.duration
                        }).addModifier(new Accidental("#"));
                    else
                        return new StaveNote({
                            keys: [`${noteNames[note.pitch % 12]}/${Math.floor(note.pitch / 12) - 1}`],
                            duration: note.duration
                        });
                });

                if (i == noteBars.length - 1) {
                    const totalTicks = noteBars[i].map(a => a.ticks).reduce((a, b) => a + b);
                    console.log(totalTicks);
                    for (let i = 0; i < 4 - totalTicks; i++) {
                        staveNotes.push(
                            new StaveNote({
                                keys: ["b/4"],
                                duration: "qr"
                            })
                        );
                    }
                }

                let stave;
                if (i % 2 == 0) stave = new Stave(10, 40 + 50 * i, 200);
                else stave = new Stave(210, 40 + 50 * (i - 1), 200);

                if (i == 0) stave.addClef("treble").addTimeSignature("4/4");

                stave.setContext(context).draw();
                console.log(staveNotes);

                const voice = new Voice({ num_beats: 4, beat_value: 4 });
                voice.addTickables(staveNotes);

                new Formatter().joinVoices([voice]).format([voice], 125);
                voice.draw(context, stave);
            }
        });
    });
});
