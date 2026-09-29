import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Modal from '../components/Modal';

describe('Modal Component', () => {
    it('does not render when isOpen is false', () => {
        render(
            <Modal isOpen={false} onClose={() => {}}>
                <div>Modal Content</div>
            </Modal>
        );
        expect(screen.queryByText('Modal Content')).toBeNull();
    });

    it('renders content and title when isOpen is true', () => {
        render(
            <Modal isOpen={true} onClose={() => {}} title="Test Modal Title">
                <div>Modal Content Body</div>
            </Modal>
        );
        expect(screen.getByText('Test Modal Title')).not.toBeNull();
        expect(screen.getByText('Modal Content Body')).not.toBeNull();
    });

    it('calls onClose when close button is clicked', () => {
        const onCloseMock = vi.fn();
        render(
            <Modal isOpen={true} onClose={onCloseMock} title="Dismissible Modal">
                <div>Content</div>
            </Modal>
        );

        const closeBtn = screen.getByRole('button', { name: /fermer/i });
        fireEvent.click(closeBtn);
        expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('calls onClose on Escape key press', () => {
        const onCloseMock = vi.fn();
        render(
            <Modal isOpen={true} onClose={onCloseMock} closeOnEsc={true}>
                <div>Content with ESC</div>
            </Modal>
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
});
