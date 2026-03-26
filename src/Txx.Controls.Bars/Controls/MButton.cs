using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace Txx.Controls.Bars;

public class MButton : Button
{
    static MButton()
    {
        DefaultStyleKeyProperty.OverrideMetadata(
            typeof(MButton),
            new FrameworkPropertyMetadata(typeof(MButton)));
    }

    public static readonly DependencyProperty LabelProperty =
        DependencyProperty.Register(nameof(Label), typeof(string), typeof(MButton),
            new PropertyMetadata(default(string)));

    public string? Label
    {
        get => (string?)GetValue(LabelProperty);
        set => SetValue(LabelProperty, value);
    }

    public static readonly DependencyProperty ImageSourceProperty =
        DependencyProperty.Register(nameof(ImageSource), typeof(ImageSource), typeof(MButton),
            new PropertyMetadata(default(ImageSource)));

    public ImageSource? ImageSource
    {
        get => (ImageSource?)GetValue(ImageSourceProperty);
        set => SetValue(ImageSourceProperty, value);
    }
}
