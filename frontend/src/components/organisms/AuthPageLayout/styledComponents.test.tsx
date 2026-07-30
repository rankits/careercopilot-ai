import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthContent, AuthRoot, FeatureIcon, FormColumn, FormStack } from './styles';

describe('AuthPageLayout styled components', () => {
  it('provides reusable Material styled layout components', () => {
    render(
      <AuthRoot as="main" mode="login">
        <AuthContent mode="login">
          <FormColumn mode="login">
            <FormStack mode="login">
              <FeatureIcon aria-label="feature icon" size="small" />
            </FormStack>
          </FormColumn>
        </AuthContent>
      </AuthRoot>,
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByLabelText('feature icon')).toBeInTheDocument();
  });
});
