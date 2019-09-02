const expect = require('expect.js');
const Score = require('../src/score');

describe('Score', function() {
  it('Score should reflect the source', function() {
    let page1 = 'Glaucosoma hebraicum, the Westralian jewfish, West Australian dhufish or West Australian pearl perch, is a species of fish in the family Glaucosomatidae, the pearl perches. It is native to the waters around Australia from Shark Bay, Western Australia, to the Archipelago of the Recherche at <b>depths </b><br>to 200 m (660 ft).[1] This species can reach 122 cm (48 in) in length, though most do not exceed 80 cm (31 in). The greatest recorded weight for this species is 26 kg (57 lb). This species is important to local commercial fisheries and is also popular as a game fish.[2] The pearlescent, silver-grey colour of this fish is broken by dark stripes. It is distinguished from a species found in the eastern states of Australia by a dark stripe over the eye region. This striping is prominent in juveniles and fades as the fish matures at about three or four years old.[3] The breeding season is between December and March, when it may be found over reefs at depths as shallow as 20 meters. At other times of the year it stays in deeper waters.',

    page2 = '<p>Minimalistic BDD assertion toolkit based on <a href="http://github.com/visionmedia/should.js" rel="nofollow">should.js</a></p> <div class="highlight js"><pre class="editor editor-colors"><div class="line"><span class="source js"><span class="meta function-call js"><span class="entity name function js"><span>expect</span></span><span class="meta js"><span class="punctuation definition begin round js"><span>(</span></span><span class="support variable dom js"><span>window</span></span><span class="meta delimiter period js"><span>.</span></span><span class="variable other js"><span>r</span></span><span class="punctuation definition end round js"><span>)</span></span></span></span><span class="meta delimiter period js"><span>.</span></span><span class="variable other object js"><span>to</span></span><span class="meta js"><span class="meta delimiter method period js"><span>.</span></span><span class="entity name function js"><span>be</span></span><span class="meta js"><span class="punctuation definition begin round js"><span>(</span></span><span class="constant language js"><span>undefined</span></span><span class="punctuation definition end round js"><span>)</span></span></span></span><span class="punctuation terminator statement js"><span>;</span></span></span></div><div class="line"><span class="source js"><span class="meta function-call js"><span class="entity name function js"><span>expect</span></span><span class="meta js"><span class="punctuation definition begin round js"><span>(</span></span><span class="meta brace curly js"><span>{</span></span>';

    let instance = new Score();
    
    expect(instance.scoreContent(page1)).to.be.above(50);
    expect(instance.scoreContent(page2)).to.be.below(50);
  });

});
