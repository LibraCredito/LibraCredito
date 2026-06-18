import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import OptimizedYouTube from '../OptimizedYouTube';

describe('OptimizedYouTube', () => {
  it('renders thumbnail without placeholder', () => {
    const { queryByAltText, getByAltText } = render(
      <OptimizedYouTube videoId="abc123" title="Test Video" />
    );

    const thumbnail = getByAltText('Miniatura do Test Video');
    const placeholder = queryByAltText('');

    expect(thumbnail).toBeInTheDocument();
    expect(placeholder).toBeNull();
  });

  it('calls player methods on click', () => {
    const unMute = vi.fn();
    const setVolume = vi.fn();
    const playVideo = vi.fn();

    const PlayerMock = vi.fn().mockImplementation((_element, options) => {
      options.events.onReady({
        target: {
          unMute,
          setVolume,
          playVideo,
        },
      });
    });

    (window as any).YT = { Player: PlayerMock };

    const { container } = render(
      <OptimizedYouTube videoId="abc123" title="Test Video" />
    );

    const button = container.querySelector('button') as HTMLButtonElement;
    fireEvent.click(button);

    expect(PlayerMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ width: '100%', height: '100%' }));
    expect(unMute).toHaveBeenCalled();
    expect(setVolume).toHaveBeenCalledWith(100);
    expect(playVideo).toHaveBeenCalled();
  });

  it('does not open a new tab when the player is started', () => {
    const openSpy = vi.spyOn(window, 'open');
    const PlayerMock = vi.fn();
    (window as any).YT = { Player: PlayerMock };

    const { container } = render(
      <OptimizedYouTube videoId="abc123" title="Test Video" />
    );

    fireEvent.click(container.querySelector('button') as HTMLButtonElement);

    expect(PlayerMock).toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
  });
});
