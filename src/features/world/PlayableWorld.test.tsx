/** A device without WebGL gets the 2D village straight away — never a blank 3D canvas. */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlayableWorld } from './PlayableWorld';

const look = { skin: 2, hair: 'short', hairColor: 0, outfit: 'tunic', outfitColor: 1, accessory: 'satchel' } as const;

describe('PlayableWorld without WebGL', () => {
  it('opens the village in 2D and offers no 3D switch', () => {
    // jsdom has no WebGL, like an unsupported device.
    const { container } = render(
      <MemoryRouter>
        <PlayableWorld sceneId="village" look={look as never} playerName="Test" rtl={false} reducedMotion onExit={() => undefined} />
      </MemoryRouter>,
    );
    expect(container.querySelector('canvas.play-world__canvas')).not.toBeNull();
    expect(container.querySelector('.play-world__three')).toBeNull();
    expect(screen.queryByRole('button', { name: /3D mode/i })).toBeNull();
  });
});
