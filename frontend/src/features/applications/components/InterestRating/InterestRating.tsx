import {
  EmptyStarIcon,
  EmptyStarIconLarge,
  FilledStarIcon,
  FilledStarIconLarge,
  InterestStarButton,
  InterestStars,
} from './styles';

export interface InterestRatingProps {
  onChange?: (value: number) => void;
  size?: 'medium' | 'large';
  value: number;
}

export function InterestRating({ onChange, size = 'medium', value }: InterestRatingProps) {
  const FilledStar = size === 'large' ? FilledStarIconLarge : FilledStarIcon;
  const EmptyStar = size === 'large' ? EmptyStarIconLarge : EmptyStarIcon;

  return (
    <InterestStars aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => {
        const rating = index + 1;
        const filled = rating <= value;

        if (onChange) {
          return (
            <InterestStarButton
              aria-label={`${rating} star${rating === 1 ? '' : 's'}`}
              aria-pressed={filled}
              key={rating}
              onClick={() => onChange(rating === value ? 0 : rating)}
              type="button"
            >
              {filled ? <FilledStar /> : <EmptyStar />}
            </InterestStarButton>
          );
        }

        return filled ? <FilledStar key={rating} /> : <EmptyStar key={rating} />;
      })}
    </InterestStars>
  );
}
